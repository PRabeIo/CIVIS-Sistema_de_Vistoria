// Perfil de cliente (D1): dados pessoais em `cliente`; e-mail/senha em `usuario`.
import path from 'path';
import db from '../config/db';
import { emTransacao } from '../config/transacao';
import { ErroHttp } from '../domain/erros';
import { safeUnlink } from '../utils/file.util';
import * as usuarioService from './usuario.service';

const CLIENTE_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'clientes');

export interface Cliente {
  idcliente: number;
  nome: string;
  cpf: string;
  email: string;
  telefone: string | null;
  imagemdeperfil: string | null;
  ativo: boolean;
}

interface DadosCliente {
  nome?: string | null;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  senha?: string | null;
}

// Nunca seleciona senha_hash.
const SELECT_CLIENTE = db`
  SELECT c.idcliente, c.nome, c.cpf, u.email, c.telefone, c.imagemdeperfil, u.ativo
  FROM cliente c
  JOIN usuario u ON u.id = c.idcliente
`;

function idValido(id: unknown): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function buscar(id: number): Promise<Cliente | undefined> {
  const [c] = await db<Cliente[]>`${SELECT_CLIENTE} WHERE c.idcliente = ${id}`;
  return c;
}

function vazioParaNull(v: string | null | undefined): string | null {
  return v === undefined || v === null || String(v).trim() === '' ? null : String(v);
}

export async function criarCliente(dados: {
  nome: string;
  cpf: string;
  email: string;
  senha: string;
  telefone?: string | null;
}): Promise<Cliente> {
  if (await usuarioService.emailEmUso(dados.email)) throw new ErroHttp(409, 'Email já cadastrado.');

  const id = await emTransacao(async (tx) => {
    const idUsuario = await usuarioService.criar(tx, {
      email: dados.email,
      senha: dados.senha,
      papel: 'cliente',
    });
    try {
      await tx`
        INSERT INTO cliente (idcliente, nome, cpf, telefone)
        VALUES (${idUsuario}, ${dados.nome}, ${dados.cpf}, ${dados.telefone || ''})
      `;
    } catch (err) {
      throw usuarioService.traduzirErroUnico(err);
    }
    return idUsuario;
  });

  return (await buscar(id)) as Cliente;
}

export async function listarClientes(): Promise<Cliente[]> {
  return db<Cliente[]>`${SELECT_CLIENTE} ORDER BY c.idcliente DESC`;
}

export async function buscarClientePorId(id: unknown): Promise<Cliente | undefined> {
  const n = idValido(id);
  return n ? buscar(n) : undefined;
}

export async function deletarCliente(id: unknown): Promise<boolean> {
  const n = idValido(id);
  return n ? usuarioService.deletar(n, ['cliente']) : false;
}

/** Atualiza perfil + identidade numa transação. Campos vazios/ausentes ficam como estão. */
async function atualizarDados(id: number, dados: DadosCliente, imagem?: string | null): Promise<Cliente | undefined> {
  if (!(await buscar(id))) return undefined;

  await emTransacao(async (tx) => {
    await usuarioService.atualizar(tx, id, {
      email: vazioParaNull(dados.email),
      senha: vazioParaNull(dados.senha),
    });
    try {
      await tx`
        UPDATE cliente SET
          nome = COALESCE(${vazioParaNull(dados.nome)}, nome),
          cpf = COALESCE(${vazioParaNull(dados.cpf)}, cpf),
          telefone = COALESCE(${dados.telefone ?? null}, telefone),
          imagemdeperfil = COALESCE(${imagem ?? null}, imagemdeperfil)
        WHERE idcliente = ${id}
      `;
    } catch (err) {
      throw usuarioService.traduzirErroUnico(err);
    }
  });

  return buscar(id);
}

export async function atualizarCliente(id: unknown, dados: DadosCliente): Promise<Cliente | undefined> {
  const n = idValido(id);
  return n ? atualizarDados(n, { ...dados, senha: null }) : undefined;
}

/** Troca a imagem com segurança: remove o arquivo novo se falhar e o antigo só após sucesso. */
async function trocarImagem<T>(
  id: number | null,
  arquivoNovo: string | null,
  atualizar: (id: number) => Promise<T | undefined>,
): Promise<T | undefined> {
  const caminhoNovo = arquivoNovo ? path.join(CLIENTE_UPLOAD_DIR, arquivoNovo) : null;
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
      safeUnlink(path.join(CLIENTE_UPLOAD_DIR, antes.imagemdeperfil));
    }
    return resultado;
  } catch (err) {
    safeUnlink(caminhoNovo);
    throw err;
  }
}

export async function atualizarClienteComImagem(
  id: unknown,
  dados: DadosCliente,
  novoArquivo: string | null,
): Promise<Cliente | undefined> {
  return trocarImagem(idValido(id), novoArquivo, (n) => atualizarDados(n, dados, novoArquivo));
}

export async function buscarMeuPerfil(idcliente: unknown): Promise<Cliente | undefined> {
  return buscarClientePorId(idcliente);
}

export async function atualizarMeuPerfil(idcliente: unknown, dados: DadosCliente): Promise<Cliente | undefined> {
  return atualizarCliente(idcliente, dados);
}

export async function atualizarMeuAvatar(idcliente: unknown, filenameNovo: string): Promise<Cliente | undefined> {
  return trocarImagem(idValido(idcliente), filenameNovo, (n) => atualizarDados(n, {}, filenameNovo));
}

export type ResultadoSenha =
  | { ok: true; erro?: undefined }
  | { ok?: undefined; erro: 'CLIENTE_NAO_ENCONTRADO' | 'SENHA_ATUAL_INCORRETA' | 'SENHA_FRACA' };

export async function atualizarMinhaSenha(
  idcliente: unknown,
  senhaAtual: string,
  senhaNova: string,
): Promise<ResultadoSenha> {
  const n = idValido(idcliente);
  if (!n || !(await buscar(n))) return { erro: 'CLIENTE_NAO_ENCONTRADO' };
  if (!senhaNova || String(senhaNova).length < usuarioService.SENHA_MIN) return { erro: 'SENHA_FRACA' };
  try {
    await usuarioService.trocarSenha(n, senhaAtual, senhaNova);
    return { ok: true };
  } catch (err) {
    if (err instanceof ErroHttp && err.statusCode === 400) return { erro: 'SENHA_ATUAL_INCORRETA' };
    throw err;
  }
}
