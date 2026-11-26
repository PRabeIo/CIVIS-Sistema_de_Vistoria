import type { Request, Response } from 'express';
import { AppError } from '../domain/erros';
import * as authService from '../services/auth.service';
import * as sessaoService from '../services/sessao.service';
import { validar } from '../validacao/comum';
import * as schemas from '../validacao/schemas';
import { accessDaRequisicao, gravarCookiesSessao, limparCookiesSessao, refreshDaRequisicao } from './_cookies';
import { usuarioDe } from './_http';

/** POST /auth/login: abre a sessão e grava os cookies. O token não vai no corpo. */
export async function login(req: Request, res: Response) {
  const { email, senha } = validar(schemas.login, req.body);
  const { usuario, tokens } = await authService.autenticar(email, senha, {
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });
  gravarCookiesSessao(res, tokens);
  return res.status(200).json({ usuario });
}

/** POST /auth/refresh: troca o refresh por um novo e renova o access. */
export async function refresh(req: Request, res: Response) {
  try {
    const { usuario, tokens } = await authService.renovar(refreshDaRequisicao(req) ?? '');
    gravarCookiesSessao(res, tokens);
    return res.status(200).json({ usuario });
  } catch (err) {
    limparCookiesSessao(res);
    throw err;
  }
}

/** POST /auth/logout: revoga a sessão atual e apaga os cookies. Sempre responde 200. */
export async function logout(req: Request, res: Response) {
  const access = accessDaRequisicao(req);
  const sid = access ? sessaoService.lerAccess(access)?.sid : undefined;
  if (sid) await sessaoService.revogar(sid);
  const refreshToken = refreshDaRequisicao(req);
  if (refreshToken) await sessaoService.revogarPorRefresh(refreshToken);
  limparCookiesSessao(res);
  return res.status(200).json({ message: 'Sessão encerrada.' });
}

/** GET /auth/me: quem está logado (usado pelo frontend ao abrir a aplicação). */
export async function me(req: Request, res: Response) {
  const usuario = await authService.usuarioLogado(usuarioDe(req).sub);
  if (!usuario) throw new AppError(401, 'NAO_AUTENTICADO', 'Sessão expirada. Faça login novamente.');
  return res.status(200).json({ usuario });
}
