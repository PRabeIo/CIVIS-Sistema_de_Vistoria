// Identidade única (D1): e-mail, senha e papel de todos os usuários.
import bcrypt from 'bcrypt';
import db from '../config/db';
import type { Executor } from '../config/transacao';
import { ErroHttp } from '../domain/erros';
import type { Papel } from '../domain/papel';

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
    throw new ErroHttp(400, `A senha deve ter pelo menos ${SENHA_MIN} caracteres.`);
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
}

export async function registrarLogin(id: number): Promise<void> {
  await db`UPDATE usuario SET ultimo_login_em = now() WHERE id = ${id}`;
}

/** Troca de senha pelo próprio usuário, exigindo a senha atual. */
export async function trocarSenha(id: number, senhaAtual: string, senhaNova: string): Promise<void> {
  const u = await buscarPorId(id);
  if (!u) throw new ErroHttp(404, 'Usuário não encontrado.');
  if (!(await conferirSenha(String(senhaAtual), u.senha_hash))) {
    throw new ErroHttp(400, 'Senha atual incorreta.');
  }
  const hash = await hashSenha(validarSenha(senhaNova));
  await db`UPDATE usuario SET senha_hash = ${hash} WHERE id = ${id}`;
}

/** Apaga o usuário; o perfil sai junto (ON DELETE CASCADE). */
export async function deletar(id: number, papeis: readonly Papel[]): Promise<boolean> {
  const r = await db`DELETE FROM usuario WHERE id = ${id} AND papel IN ${db(papeis as Papel[])} RETURNING id`;
  return r.length > 0;
}

/** Violação de UNIQUE (e-mail em usuario, CPF nos perfis) vira 409 com mensagem clara. */
export function traduzirErroUnico(err: unknown): unknown {
  const e = err as { code?: string; constraint_name?: string };
  if (e?.code !== '23505') return err;
  if (e.constraint_name === 'usuario_email_key') return new ErroHttp(409, 'Email já cadastrado.');
  if (e.constraint_name?.endsWith('_cpf_key')) return new ErroHttp(409, 'CPF já cadastrado.');
  return new ErroHttp(409, 'Registro duplicado.');
}
