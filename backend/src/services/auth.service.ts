import db from '../config/db';
import { AppError } from '../domain/erros';
import { CARGO_POR_PAPEL, type Cargo, type Papel } from '../domain/papel';
import * as sessaoService from './sessao.service';
import * as usuarioService from './usuario.service';

export interface UsuarioLogado {
  id: number;
  /** Mantido com este nome por compatibilidade com o frontend; é o papel. */
  tipo: Papel;
  cargo: Cargo;
  nome: string | null;
  email: string;
}

const CREDENCIAIS_INVALIDAS = () => new AppError(401, 'NAO_AUTENTICADO', 'Email ou senha inválidos.');

/** Dados públicos do usuário (o que o frontend guarda para saber quem está logado). */
export async function usuarioLogado(id: number): Promise<UsuarioLogado | null> {
  const [u] = await db<{ id: number; email: string; papel: Papel; nome: string | null }[]>`
    SELECT u.id, u.email, u.papel, COALESCE(c.nome, f.nome) AS nome
    FROM usuario u
    LEFT JOIN cliente c ON c.idcliente = u.id
    LEFT JOIN funcionario f ON f.id = u.id
    WHERE u.id = ${id} AND u.ativo
  `;
  if (!u) return null;
  return { id: u.id, tipo: u.papel, cargo: CARGO_POR_PAPEL[u.papel], nome: u.nome, email: u.email };
}

/**
 * Login em uma única tabela (D1) que abre uma sessão revogável (S5).
 * Mesma resposta para e-mail inexistente e senha errada.
 */
export async function autenticar(
  email: string,
  senha: string,
  meta: sessaoService.MetaSessao = {},
): Promise<{ usuario: UsuarioLogado; tokens: sessaoService.TokensSessao }> {
  const u = await usuarioService.buscarPorEmail(String(email).trim());
  if (!u) throw CREDENCIAIS_INVALIDAS();

  if (!(await usuarioService.conferirSenha(String(senha), u.senha_hash))) throw CREDENCIAIS_INVALIDAS();
  if (!u.ativo) throw new AppError(403, 'USUARIO_INATIVO', 'Usuário desativado. Procure o administrador.');

  await usuarioService.registrarLogin(u.id);
  const tokens = await sessaoService.criar(u.id, meta);
  const usuario = (await usuarioLogado(u.id)) as UsuarioLogado;
  return { usuario, tokens };
}

/** Renova a sessão a partir do refresh token (rotação). */
export async function renovar(refresh: string): Promise<{ usuario: UsuarioLogado; tokens: sessaoService.TokensSessao }> {
  const r = await sessaoService.renovar(refresh);
  const usuario = r && (await usuarioLogado(r.usuarioId));
  if (!r || !usuario) throw new AppError(401, 'NAO_AUTENTICADO', 'Sessão expirada. Faça login novamente.');
  return { usuario, tokens: r };
}
