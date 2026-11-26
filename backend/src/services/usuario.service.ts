// Identidade única (D1): e-mail, senha e papel de todos os usuários.
import bcrypt from 'bcrypt';
import db from '../config/db';
import type { Executor } from '../config/transacao';
import { AppError } from '../domain/erros';
import type { Papel } from '../domain/papel';
import { revogarTodas } from './sessao.service';

export const SENHA_MIN = 8;

export interface UsuarioRow {
  id: number;
  email: string;
  senha_hash: string;
  papel: Papel;
  ativo: boolean;
}

function saltRounds(): number {
  return Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
}

export function validarSenha(senha: unknown): string {
  if (typeof senha !== 'string' || senha.length < SENHA_MIN) {
    throw new AppError(400, 'VALIDACAO', `A senha deve ter pelo menos ${SENHA_MIN} caracteres.`);
  }
  return senha;
}

export function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, saltRounds());
}

export function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export async function buscarPorEmail(email: string): Promise<UsuarioRow | undefined> {
  const [u] = await db<UsuarioRow[]>`
    SELECT id, email, senha_hash, papel, ativo FROM usuario WHERE email = ${email}
  `;
  return u;
}

export async function buscarPorId(id: number): Promise<UsuarioRow | undefined> {
  const [u] = await db<UsuarioRow[]>`
    SELECT id, email, senha_hash, papel, ativo FROM usuario WHERE id = ${id}
  `;
  return u;
}

export async function emailEmUso(email: string, excetoId?: number): Promise<boolean> {
  const [r] = await db`
    SELECT 1 FROM usuario WHERE email = ${email} AND id IS DISTINCT FROM ${excetoId ?? null}
  `;
  return Boolean(r);
}

/** Cria o usuário (identidade). O perfil (cliente/funcionario) é criado pelo chamador no mesmo `tx`. */
export async function criar(
  tx: Executor,
  { email, senha, papel }: { email: string; senha: string; papel: Papel },
): Promise<number> {
  const senhaHash = await hashSenha(validarSenha(senha));
  try {
    const [u] = await tx<{ id: number }[]>`
      INSERT INTO usuario (email, senha_hash, papel)
      VALUES (${email}, ${senhaHash}, ${papel})
      RETURNING id
    `;
    return u.id;
  } catch (err) {
    throw traduzirErroUnico(err);
  }
}

/** Atualiza e-mail e/ou senha e/ou papel. Campos ausentes ficam como estão. */
export async function atualizar(
  tx: Executor,
  id: number,
  dados: { email?: string | null; senha?: string | null; papel?: Papel | null },
): Promise<void> {
  const senhaHash = dados.senha ? await hashSenha(validarSenha(dados.senha)) : null;
  const [antes] = await tx<{ papel: Papel }[]>`SELECT papel FROM usuario WHERE id = ${id}`;
  try {
    await tx`
      UPDATE usuario SET
        email = COALESCE(${dados.email ?? null}, email),
        senha_hash = COALESCE(${senhaHash}, senha_hash),
        papel = COALESCE(${dados.papel ?? null}, papel)
      WHERE id = ${id}
    `;
  } catch (err) {
    throw traduzirErroUnico(err);
  }

  // S5: mudou o papel ou a senha (pelo admin) → encerra as sessões abertas do usuário.
  if ((dados.papel && antes && dados.papel !== antes.papel) || senhaHash) {
    await revogarTodas(id, undefined, tx);
  }
}

export async function registrarLogin(id: number): Promise<void> {
  await db`UPDATE usuario SET ultimo_login_em = now() WHERE id = ${id}`;
}

/** Troca de senha pelo próprio usuário, exigindo a senha atual. Encerra as outras sessões (S5). */
export async function trocarSenha(
  id: number,
  senhaAtual: string,
  senhaNova: string,
  manterSid?: string,
): Promise<void> {
  const u = await buscarPorId(id);
  if (!u) throw new AppError(404, 'NAO_ENCONTRADO', 'Usuário não encontrado.');
  if (!(await conferirSenha(String(senhaAtual), u.senha_hash))) {
    throw new AppError(400, 'SENHA_INCORRETA', 'Senha atual incorreta.');
  }
  const hash = await hashSenha(validarSenha(senhaNova));
  await db`UPDATE usuario SET senha_hash = ${hash} WHERE id = ${id}`;
  await revogarTodas(id, manterSid);
}

/**
 * S8: impede que `id` deixe de ser administrador se ele for o último admin ativo.
 * Trava as linhas dos admins até o fim da transação, então duas remoções simultâneas não passam juntas.
 */
export async function exigirOutroAdmin(tx: Executor, id: number): Promise<void> {
  const admins = await tx<{ id: number }[]>`
    SELECT id FROM usuario WHERE papel = 'admin' AND ativo ORDER BY id FOR UPDATE
  `;
  if (admins.length <= 1 && admins.some((a) => a.id === id)) {
    throw new AppError(409, 'ULTIMO_ADMIN', 'Não é possível remover o último administrador do sistema.');
  }
}

/** Apaga o usuário; o perfil sai junto (ON DELETE CASCADE). */
export async function deletar(id: number, papeis: readonly Papel[], ex: Executor = db): Promise<boolean> {
  const r = await ex`DELETE FROM usuario WHERE id = ${id} AND papel IN ${db(papeis as Papel[])} RETURNING id`;
  return r.length > 0;
}

/** Violação de UNIQUE (e-mail em usuario, CPF nos perfis) vira 409 com mensagem clara. */
export function traduzirErroUnico(err: unknown): unknown {
  const e = err as { code?: string; constraint_name?: string };
  if (e?.code !== '23505') return err;
  if (e.constraint_name === 'usuario_email_key') return new AppError(409, 'EMAIL_EM_USO', 'Email já cadastrado.');
  if (e.constraint_name?.endsWith('_cpf_key')) return new AppError(409, 'CPF_EM_USO', 'CPF já cadastrado.');
  return new AppError(409, 'CONFLITO', 'Registro duplicado.');
}
