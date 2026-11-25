import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import sql from '../src/config/db.js';
import { SENHA_PADRAO, USUARIOS_SEED } from '../scripts/seed';

afterAll(() => sql.end());

async function login(email, senha = SENHA_PADRAO) {
  return request(app).post('/api/auth/login').send({ email, senha });
}

describe('POST /api/auth/login', () => {
  it('autentica o admin do seed e devolve token', async () => {
    const res = await login(USUARIOS_SEED.admin.email);
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.usuario).toMatchObject({ tipo: 'admin', email: USUARIOS_SEED.admin.email });
  });

  it('autentica cliente e vistoriador com o tipo correto', async () => {
    expect((await login(USUARIOS_SEED.cliente.email)).body.usuario.tipo).toBe('cliente');
    expect((await login(USUARIOS_SEED.vistoriador.email)).body.usuario.tipo).toBe('vistoriador');
  });

  it('recusa senha errada com 401', async () => {
    const res = await login(USUARIOS_SEED.admin.email, 'senha-errada');
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });
});

describe('rotas protegidas', () => {
  it('recusa acesso sem token', async () => {
    const res = await request(app).get('/api/empreendimentos');
    expect(res.status).toBe(401);
  });

  it('recusa token inválido', async () => {
    const res = await request(app).get('/api/empreendimentos').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('permite admin e bloqueia cliente em rota de admin', async () => {
    const admin = (await login(USUARIOS_SEED.admin.email)).body.token;
    const cliente = (await login(USUARIOS_SEED.cliente.email)).body.token;

    const ok = await request(app).get('/api/empreendimentos').set('Authorization', `Bearer ${admin}`);
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual(expect.arrayContaining([expect.objectContaining({ nome: 'Residencial Teste' })]));

    const negado = await request(app).get('/api/empreendimentos').set('Authorization', `Bearer ${cliente}`);
    expect(negado.status).toBe(403);
  });
});
