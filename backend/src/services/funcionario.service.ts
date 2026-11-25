// Perfil de funcionário (D1): admin e vistoriador. Dados pessoais em `funcionario`;
// e-mail, senha e papel em `usuario`. `cargo` é derivado do papel (compatível com o frontend).
import path from 'path';
import db from '../config/db';
import { emTransacao } from '../config/transacao';
import { ErroHttp } from '../domain/erros';
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

export async function listarComCargo(): Promise<Funcionario[]> {
  return db<Funcionario[]>`${SELECT_FUNCIONARIO} ORDER BY f.id DESC`;
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
  if (!papel) throw new ErroHttp(400, 'Cargo inválido.');
  if (await usuarioService.emailEmUso(dados.email)) throw new ErroHttp(409, 'Email já cadastrado.');

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
): Promise<Funcionario | undefined> {
  if (!(await buscar(id))) return undefined;

  const papel = dados.cargo ? papelDoCargo(dados.cargo) : null;
  if (dados.cargo && !papel) throw new ErroHttp(400, 'Cargo inválido.');

  await emTransacao(async (tx) => {
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

/** Admin edita funcionário (inclui troca de cargo e, opcionalmente, foto e senha). */
export async function atualizar(
  id: unknown,
  dados: DadosFuncionario,
  imagemdeperfil: string | null = null,
): Promise<Funcionario | undefined> {
  return comImagem(idValido(id), imagemdeperfil, (n) => atualizarDados(n, dados, imagemdeperfil));
}

export async function deletar(id: unknown): Promise<boolean> {
  const n = idValido(id);
  return n ? usuarioService.deletar(n, PAPEIS_FUNCIONARIO) : false;
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

export async function alterarMinhaSenha(
  id: unknown,
  senhaAtual: string,
  senhaNova: string,
): Promise<{ ok: true } | { ok: false; status: number; msg: string }> {
  const n = idValido(id);
  if (!n) return { ok: false, status: 400, msg: 'ID inválido.' };
  if (!(await buscar(n))) return { ok: false, status: 404, msg: 'Funcionário não encontrado.' };
  try {
    await usuarioService.trocarSenha(n, senhaAtual, senhaNova);
    return { ok: true };
  } catch (err) {
    if (err instanceof ErroHttp) return { ok: false, status: err.statusCode, msg: err.message };
    throw err;
  }
}
