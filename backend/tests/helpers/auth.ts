import request from 'supertest';
import app from '../../src/app.js';
import { SENHA_PADRAO, USUARIOS_SEED } from '../../scripts/seed';

export type PapelSeed = keyof typeof USUARIOS_SEED;

/** Faz login com um usuário do seed e devolve o token JWT. */
export async function tokenDe(papel: PapelSeed): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: USUARIOS_SEED[papel].email, senha: SENHA_PADRAO });
  if (res.status !== 200) throw new Error(`login de ${papel} falhou: ${res.status}`);
  return res.body.token as string;
}
