// Perfil de cliente (D1): dados pessoais em `cliente`; e-mail/senha em `usuario`.
import { randomBytes } from 'crypto';
import path from 'path';
import db from '../config/db';
import { emTransacao } from '../config/transacao';
import { AppError } from '../domain/erros';
import { comCpfMascarado, TERMOS_VERSAO } from '../domain/lgpd';
import { revogarTodas } from './sessao.service';
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
  aceiteTermos?: boolean;
}): Promise<Cliente> {
  if (await usuarioService.emailEmUso(dados.email)) throw new AppError(409, 'EMAIL_EM_USO', 'Email já cadastrado.');

  const id = await emTransacao(async (tx) => {
    const idUsuario = await usuarioService.criar(tx, {
      email: dados.email,
      senha: dados.senha,
      papel: 'cliente',
    });
    try {
      await tx`
        INSERT INTO cliente (idcliente, nome, cpf, telefone, termos_aceitos_em, termos_versao)
        VALUES (
          ${idUsuario}, ${dados.nome}, ${dados.cpf}, ${dados.telefone || ''},
          ${dados.aceiteTermos ? new Date() : null}, ${dados.aceiteTermos ? TERMOS_VERSAO : null}
        )
      `;
    } catch (err) {
      throw usuarioService.traduzirErroUnico(err);
    }
    return idUsuario;
  });

  return (await buscar(id)) as Cliente;
}

/** S11: listagem com CPF mascarado; o CPF completo só aparece no detalhe (GET /clientes/:id). */
export async function listarClientes(): Promise<Cliente[]> {
  const linhas = await db<Cliente[]>`${SELECT_CLIENTE} WHERE c.anonimizado_em IS NULL ORDER BY c.idcliente DESC`;
  return comCpfMascarado(linhas as unknown as Record<string, unknown>[]) as unknown as Cliente[];
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
  return n ? atualizarDados(n, dados) : undefined; // senha vazia/ausente fica como está
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

/** Troca de senha pelo próprio cliente (exige a senha atual). */
export async function trocarMinhaSenha(
  idcliente: unknown,
  senhaAtual: string,
  senhaNova: string,
  manterSid?: string,
): Promise<void> {
  const n = idValido(idcliente);
  if (!n || !(await buscar(n))) throw new AppError(404, 'NAO_ENCONTRADO', 'Cliente não encontrado.');
  await usuarioService.trocarSenha(n, senhaAtual, senhaNova, manterSid);
}

// ---------- S11: direitos do titular (LGPD) ----------

/** Exportação dos próprios dados: perfil, imóveis, vistorias e sessões (sem hashes nem caminhos internos). */
export async function exportarMeusDados(idcliente: unknown) {
  const n = idValido(idcliente);
  const [perfil] = n
    ? await db`
        SELECT c.nome, c.cpf, u.email, c.telefone, u.criado_em, u.ultimo_login_em,
               c.termos_aceitos_em, c.termos_versao, (c.imagemdeperfil IS NOT NULL) AS tem_foto_perfil
        FROM cliente c JOIN usuario u ON u.id = c.idcliente
        WHERE c.idcliente = ${n} AND c.anonimizado_em IS NULL`
    : [];
  if (!perfil) throw new AppError(404, 'NAO_ENCONTRADO', 'Cliente não encontrado.');

  const imoveis = await db`
    SELECT i.idimovel, i.descricao, i.bloco, i.numero, e.nome AS empreendimento, e.cidade, e.estado
    FROM imovel i LEFT JOIN empreendimento e ON e.idempreendimento = i.idempreendimento
    WHERE i.idcliente = ${n} ORDER BY i.idimovel`;

  const vistorias = await db`
    SELECT v.idvistoria, v.idimovel, v.status, v.dataagendada, v.datahorainicio, v.datahorafim,
           v.observacoes, (v.relatorio_arquivo IS NOT NULL) AS tem_relatorio, f.nome AS vistoriador
    FROM vistoria v LEFT JOIN funcionario f ON f.id = v.idvistoriador
    WHERE v.idcliente = ${n} ORDER BY v.idvistoria`;

  const sessoes = await db`
    SELECT criado_em, ultimo_uso_em, expira_em, revogada_em, user_agent, ip
    FROM sessao WHERE usuario_id = ${n} ORDER BY criado_em DESC`;

  return { geradoEm: new Date().toISOString(), perfil, imoveis, vistorias, sessoes };
}

const STATUS_QUE_BLOQUEIAM_EXCLUSAO = ['Vistoria Agendada', 'Vistoria Reagendada', 'Em Andamento', 'Aguardando Validação'];

/**
 * Exclusão da própria conta (exige a senha).
 * - Sem vistorias: apaga usuário e perfil.
 * - Com vistorias: anonimiza (nome, CPF, telefone, foto, e-mail e senha) e desativa o login;
 *   as vistorias e relatórios ficam com a construtora, sem dados pessoais do titular.
 * - Com vistoria agendada ou em curso: 409 (o vistoriador iria até um titular que não existe mais).
 */
export async function excluirMinhaConta(idcliente: unknown, senha: string): Promise<{ modo: 'excluida' | 'anonimizada' }> {
  const n = idValido(idcliente);
  const u = n ? await usuarioService.buscarPorId(n) : undefined;
  const antes = n ? await buscar(n) : undefined;
  if (!n || !u || !antes || u.papel !== 'cliente') throw new AppError(404, 'NAO_ENCONTRADO', 'Cliente não encontrado.');
  if (!(await usuarioService.conferirSenha(String(senha), u.senha_hash))) {
    throw new AppError(400, 'SENHA_INCORRETA', 'Senha incorreta.');
  }

  const modo = await emTransacao(async (tx) => {
    const vistorias = await tx<{ status: string }[]>`
      SELECT status FROM vistoria WHERE idcliente = ${n} FOR UPDATE`;
    if (vistorias.some((v) => STATUS_QUE_BLOQUEIAM_EXCLUSAO.includes(v.status))) {
      throw new AppError(
        409,
        'VISTORIA_EM_ABERTO',
        'Você tem vistoria agendada ou em andamento. Aguarde a conclusão ou fale com a construtora para cancelá-la.',
      );
    }

    if (vistorias.length === 0) {
      await usuarioService.deletar(n, ['cliente'], tx);
      return 'excluida' as const;
    }

    const senhaInutil = await usuarioService.hashSenha(randomBytes(24).toString('hex') + 'a1');
    await tx`
      UPDATE usuario SET email = ${`removido-${n}@anonimizado.invalid`}, senha_hash = ${senhaInutil}, ativo = FALSE
      WHERE id = ${n}`;
    await tx`
      UPDATE cliente SET nome = 'Titular removido', cpf = ${`anon-${n}`}, telefone = NULL,
             imagemdeperfil = NULL, anonimizado_em = now()
      WHERE idcliente = ${n}`;
    await revogarTodas(n, undefined, tx);
    return 'anonimizada' as const;
  });

  if (antes.imagemdeperfil) safeUnlink(path.join(CLIENTE_UPLOAD_DIR, antes.imagemdeperfil));
  return { modo };
}
