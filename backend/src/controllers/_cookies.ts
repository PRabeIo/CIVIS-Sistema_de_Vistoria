// S5: cookies de sessão. Nada de token em localStorage: o navegador guarda e envia os cookies.
import type { CookieOptions, Request, Response } from 'express';
import { ACCESS_TTL_SEG, REFRESH_TTL_SEG, type TokensSessao } from '../services/sessao.service';

export const COOKIE_ACCESS = 'civis_at';
export const COOKIE_REFRESH = 'civis_rt';

function base(): CookieOptions {
  const sameSite = (process.env.COOKIE_SAMESITE || 'strict').toLowerCase() as 'strict' | 'lax' | 'none';
  const secure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production';
  // SameSite=None exige Secure (navegadores recusam o cookie sem ele).
  return { httpOnly: true, sameSite, secure: sameSite === 'none' ? true : secure };
}

// O refresh só precisa ir para /api/auth (refresh e logout); o access vai para toda a API.
const opcoesAccess = (): CookieOptions => ({ ...base(), path: '/api' });
const opcoesRefresh = (): CookieOptions => ({ ...base(), path: '/api/auth' });

export function gravarCookiesSessao(res: Response, tokens: TokensSessao): void {
  res.cookie(COOKIE_ACCESS, tokens.access, { ...opcoesAccess(), maxAge: ACCESS_TTL_SEG * 1000 });
  res.cookie(COOKIE_REFRESH, tokens.refresh, { ...opcoesRefresh(), maxAge: REFRESH_TTL_SEG * 1000 });
}

export function limparCookiesSessao(res: Response): void {
  res.clearCookie(COOKIE_ACCESS, opcoesAccess());
  res.clearCookie(COOKIE_REFRESH, opcoesRefresh());
}

/** Access token do cookie ou, para clientes de API/testes, do header `Authorization: Bearer`. */
export function accessDaRequisicao(req: Request): string | null {
  const doCookie = req.cookies?.[COOKIE_ACCESS];
  if (typeof doCookie === 'string' && doCookie) return doCookie;
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  return tipo === 'Bearer' && token ? token : null;
}

export function refreshDaRequisicao(req: Request): string | null {
  const r = req.cookies?.[COOKIE_REFRESH];
  return typeof r === 'string' && r ? r : null;
}
