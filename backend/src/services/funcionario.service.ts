// Perfil de funcionário (D1): admin e vistoriador. Dados pessoais em `funcionario`;
// e-mail, senha e papel em `usuario`. `cargo` é derivado do papel (compatível com o frontend).
import path from 'path';
import db from '../config/db';
import { emTransacao } from '../config/transacao';
import { AppError } from '../domain/erros';
import { comCpfMascarado } from '../domain/lgpd';
import { papelDoCargo, type Cargo, type PapelFuncionario } from '../domain/papel';
import { safeUnlink } from '../utils/file.util';
import * as usuarioService from './usuario.service';

const FUNCIONARIO_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'funcionarios');
const PAPEIS_FUNCIONARIO: readonly PapelFuncionario[] = ['admin', 'vistoriador'];

export interface Funcionario {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  telefone: string | null;
  imagemdeperfil: string | null;
  papel: PapelFuncionario;
  cargo: Exclude<Cargo, 'Cliente'>;
  ativo: boolean;
  /** B12: há assinatura cadastrada (a imagem em si só sai por GET /funcionarios/me/assinatura). */
  tem_assinatura: boolean;
}

interface DadosFuncionario {
  nome?: string | null;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  senha?: string | null;
  cargo?: string | null;
}

// Nunca seleciona senha_hash.
const SELECT_FUNCIONARIO = db`
  SELECT f.id, f.nome, f.cpf, u.email, f.telefone, f.imagemdeperfil, u.papel, u.ativo,
         (f.assinatura IS NOT NULL) AS tem_assinatura,
         CASE u.papel WHEN 'admin' THEN 'Administrador' ELSE 'Vistoriador' END AS cargo
  FROM funcionario f
  JOIN usuario u ON u.id = f.id
`;

function idValido(id: unknown): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function vazioParaNull(v: string | null | undefined): string | null {
  return v === undefined || v === null || String(v).trim() === '' ? null : String(v);
}

async function buscar(id: number): Promise<Funcionario | undefined> {
  const [f] = await db<Funcionario[]>`${SELECT_FUNCIONARIO} WHERE f.id = ${id}`;
  return f;
}

/** S11: listagem com CPF mascarado; o CPF completo só aparece no detalhe (GET /funcionarios/:id). */
export async function listarComCargo(): Promise<Funcionario[]> {
  const linhas = await db<Funcionario[]>`${SELECT_FUNCIONARIO} ORDER BY f.id DESC`;
  return comCpfMascarado(linhas as unknown as Record<string, unknown>[]) as unknown as Funcionario[];
}

export async function buscarPorIdComCargo(id: unknown): Promise<Funcionario | undefined> {
  const n = idValido(id);
  return n ? buscar(n) : undefined;
}

export const buscarPerfil = buscarPorIdComCargo;
export const buscarMeuPerfil = buscarPorIdComCargo;

export async function criar(dados: {
  cpf: string;
  email: string;
  nome: string;
  senha: string;
  telefone?: string | null;
  cargo: string;
  imagemdeperfil?: string | null;
}): Promise<Funcionario> {
  const papel = papelDoCargo(dados.cargo);
  if (!papel) throw new AppError(400, 'VALIDACAO', 'Cargo inválido.');
  if (await usuarioService.emailEmUso(dados.email)) throw new AppError(409, 'EMAIL_EM_USO', 'Email já cadastrado.');

  const id = await emTransacao(async (tx) => {
    const idUsuario = await usuarioService.criar(tx, { email: dados.email, senha: dados.senha, papel });
    try {
      await tx`
        INSERT INTO funcionario (id, cpf, nome, telefone, imagemdeperfil)
        VALUES (${idUsuario}, ${dados.cpf}, ${dados.nome}, ${dados.telefone ?? null}, ${dados.imagemdeperfil ?? null})
      `;
    } catch (err) {
      throw usuarioService.traduzirErroUnico(err);
    }
    return idUsuario;
  });

  return (await buscar(id)) as Funcionario;
}

async function atualizarDados(
  id: number,
  dados: DadosFuncionario,
  imagem?: string | null,
  atorId?: number,
): Promise<Funcionario | undefined> {
  const antes = await buscar(id);
  if (!antes) return undefined;

  const papel = dados.cargo ? papelDoCargo(dados.cargo) : null;
  if (dados.cargo && !papel) throw new AppError(400, 'VALIDACAO', 'Cargo inválido.');
  const rebaixaAdmin = antes.papel === 'admin' && papel !== null && papel !== 'admin';
  if (rebaixaAdmin && id === atorId) {
    throw new AppError(409, 'ACAO_SOBRE_SI_MESMO', 'Você não pode remover o seu próprio acesso de administrador.');
  }

  await emTransacao(async (tx) => {
    if (rebaixaAdmin) await usuarioService.exigirOutroAdmin(tx, id);
    await usuarioService.atualizar(tx, id, {
      email: vazioParaNull(dados.email),
      senha: vazioParaNull(dados.senha),
      papel,
    });
    try {
      await tx`
        UPDATE funcionario SET
          nome = COALESCE(${vazioParaNull(dados.nome)}, nome),
          cpf = COALESCE(${vazioParaNull(dados.cpf)}, cpf),
          telefone = COALESCE(${dados.telefone ?? null}, telefone),
          imagemdeperfil = COALESCE(${imagem ?? null}, imagemdeperfil)
        WHERE id = ${id}
      `;
    } catch (err) {
      throw usuarioService.traduzirErroUnico(err);
    }
  });

  return buscar(id);
}

/** Troca a imagem com segurança: remove o arquivo novo se falhar e o antigo só após sucesso. */
async function comImagem(
  id: number | null,
  arquivoNovo: string | null,
  atualizar: (id: number) => Promise<Funcionario | undefined>,
): Promise<Funcionario | undefined> {
  const caminhoNovo = arquivoNovo ? path.join(FUNCIONARIO_UPLOAD_DIR, arquivoNovo) : null;
  if (!id) {
    safeUnlink(caminhoNovo);
    return undefined;
  }
  try {
    const antes = await buscar(id);
    if (!antes) {
      safeUnlink(caminhoNovo);
      return undefined;
    }
    const resultado = await atualizar(id);
    if (arquivoNovo && antes.imagemdeperfil && antes.imagemdeperfil !== arquivoNovo) {
      safeUnlink(path.join(FUNCIONARIO_UPLOAD_DIR, antes.imagemdeperfil));
    }
    return resultado;
  } catch (err) {
    safeUnlink(caminhoNovo);
    throw err;
  }
}

/**
 * Admin edita funcionário (inclui troca de cargo e, opcionalmente, foto e senha).
 * S8: `atorId` é o admin logado; ele não pode rebaixar a si mesmo, e o último admin não pode ser rebaixado.
 */
export async function atualizar(
  id: unknown,
  dados: DadosFuncionario,
  imagemdeperfil: string | null = null,
  atorId?: number,
): Promise<Funcionario | undefined> {
  return comImagem(idValido(id), imagemdeperfil, (n) => atualizarDados(n, dados, imagemdeperfil, atorId));
}

/** S8: o admin não exclui a própria conta, e o último admin ativo não pode ser excluído. */
export async function deletar(id: unknown, atorId?: number): Promise<boolean> {
  const n = idValido(id);
  if (!n) return false;
  if (n === atorId) throw new AppError(409, 'ACAO_SOBRE_SI_MESMO', 'Você não pode excluir a sua própria conta.');
  return emTransacao(async (tx) => {
    await usuarioService.exigirOutroAdmin(tx, n);
    return usuarioService.deletar(n, PAPEIS_FUNCIONARIO, tx);
  });
}

/** O próprio funcionário edita seus dados (sem senha, sem cargo, sem imagem). */
export async function atualizarMeuPerfil(id: unknown, dados: DadosFuncionario): Promise<Funcionario | undefined> {
  const n = idValido(id);
  if (!n) return undefined;
  return atualizarDados(n, { nome: dados.nome, cpf: dados.cpf, email: dados.email, telefone: dados.telefone });
}

export async function atualizarMeuAvatar(id: unknown, filenameNovo: string | null): Promise<Funcionario | undefined> {
  return comImagem(idValido(id), filenameNovo, (n) => atualizarDados(n, {}, filenameNovo));
}

/** B12: assinatura do próprio funcionário (imagem JPEG/PNG já conferida pelo upload). */
export async function salvarMinhaAssinatura(id: number, imagem: Buffer, tipo: string): Promise<void> {
  await db`UPDATE funcionario SET assinatura = ${imagem}, assinatura_tipo = ${tipo} WHERE id = ${id}`;
}

export async function removerMinhaAssinatura(id: number): Promise<void> {
  await db`UPDATE funcionario SET assinatura = NULL, assinatura_tipo = NULL WHERE id = ${id}`;
}

export async function buscarMinhaAssinatura(id: number): Promise<{ imagem: Buffer; tipo: string } | undefined> {
  const [r] = await db<{ assinatura: Buffer | null; assinatura_tipo: string | null }[]>`
    SELECT assinatura, assinatura_tipo FROM funcionario WHERE id = ${id}
  `;
  return r?.assinatura && r.assinatura_tipo ? { imagem: r.assinatura, tipo: r.assinatura_tipo } : undefined;
}

/** Troca de senha pelo próprio funcionário (exige a senha atual). */
export async function trocarMinhaSenha(
  id: unknown,
  senhaAtual: string,
  senhaNova: string,
  manterSid?: string,
): Promise<void> {
  const n = idValido(id);
  if (!n || !(await buscar(n))) throw new AppError(404, 'NAO_ENCONTRADO', 'Funcionário não encontrado.');
  await usuarioService.trocarSenha(n, senhaAtual, senhaNova, manterSid);
}
