import request from 'supertest';
import app from '../../src/app.js';
import { SENHA_PADRAO, USUARIOS_SEED } from '../../scripts/seed';

export type PapelSeed = keyof typeof USUARIOS_SEED;

/** Lê o valor de um cookie do header Set-Cookie de uma resposta. */
export function cookieDe(res: request.Response, nome: string): string | null {
  const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  for (const c of setCookie) {
    const [par] = c.split(';');
    const [k, ...v] = par.split('=');
    if (k.trim() === nome) return v.join('=');
  }
  return null;
}

/** Faz login e devolve a resposta (com os cookies de sessão). */
export function loginComo(email: string, senha = SENHA_PADRAO) {
  return request(app).post('/api/auth/login').send({ email, senha });
}

/**
 * Faz login com um usuário do seed e devolve o access token (cookie `civis_at`).
 * Os testes o enviam como `Authorization: Bearer`, que o backend aceita para clientes de API.
 */
export async function tokenDe(papel: PapelSeed): Promise<string> {
  const res = await loginComo(USUARIOS_SEED[papel].email);
  const token = res.status === 200 ? cookieDe(res, 'civis_at') : null;
  if (!token) throw new Error(`login de ${papel} falhou: ${res.status}`);
  return token;
}
