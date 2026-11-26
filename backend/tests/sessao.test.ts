// S5: sessão em cookies httpOnly, refresh com rotação, logout e revogação imediata.
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import sql from '../src/config/db.js';
import { SENHA_PADRAO, USUARIOS_SEED } from '../scripts/seed';
import { cookieDe, tokenDe } from './helpers/auth';
import { gerarCpf, gerarEmail } from './helpers/dados';

let admin: string;

beforeAll(async () => {
  admin = await tokenDe('admin');
});
afterAll(() => sql.end());

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

/** Cria um funcionário novo (para testes que revogam/excluem sem afetar o seed). */
async function novoFuncionario(cargo: 'Vistoriador' | 'Administrador' = 'Vistoriador') {
  const dados = { nome: 'Sessao Teste', cpf: gerarCpf(), email: gerarEmail('sessao'), senha: 'senhaForte1', cargo };
  const res = await request(app).post('/api/funcionarios').set(bearer(admin)).send(dados);
  expect(res.status).toBe(201);
  return { id: res.body.id as number, ...dados };
}

/** Agente com cookie jar: se comporta como o navegador. */
async function agenteLogado(email: string, senha = SENHA_PADRAO) {
  const agente = request.agent(app);
  const res = await agente.post('/api/auth/login').send({ email, senha });
  expect(res.status).toBe(200);
  return { agente, res };
}

describe('login com cookies', () => {
  it('grava cookies httpOnly + SameSite=Strict e não devolve token no corpo', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: USUARIOS_SEED.cliente.email, senha: SENHA_PADRAO });
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('token');

    const cookies = ([] as string[]).concat(res.headers['set-cookie']);
    const at = cookies.find((c) => c.startsWith('civis_at='))!;
    const rt = cookies.find((c) => c.startsWith('civis_rt='))!;
    expect(at).toMatch(/HttpOnly/i);
    expect(at).toMatch(/SameSite=Strict/i);
    expect(at).toMatch(/Path=\/api(;|$)/);
    expect(rt).toMatch(/HttpOnly/i);
    expect(rt).toMatch(/Path=\/api\/auth/);
  });

  it('o navegador acessa a API só com o cookie (sem Authorization)', async () => {
    const { agente } = await agenteLogado(USUARIOS_SEED.cliente.email);
    const me = await agente.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.usuario).toMatchObject({ tipo: 'cliente', email: USUARIOS_SEED.cliente.email });
    expect((await agente.get('/api/vistorias/minhas')).status).toBe(200);
  });

  it('access token expirado → 401', async () => {
    const valido = jwt.decode(await tokenDe('cliente')) as unknown as { sub: number; sid: string };
    const expirado = jwt.sign({ sub: valido.sub, sid: valido.sid, exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET as string);
    expect((await request(app).get('/api/auth/me').set(bearer(expirado))).status).toBe(401);
  });
});

describe('refresh', () => {
  it('rotaciona: o refresh antigo deixa de valer e o novo funciona', async () => {
    const { agente, res } = await agenteLogado(USUARIOS_SEED.cliente.email);
    const refreshAntigo = cookieDe(res, 'civis_rt');

    const r1 = await agente.post('/api/auth/refresh');
    expect(r1.status).toBe(200);
    expect(r1.body.usuario.tipo).toBe('cliente');
    expect(cookieDe(r1, 'civis_rt')).not.toBe(refreshAntigo);

    // reapresentar o refresh antigo falha
    const reuso = await request(app).post('/api/auth/refresh').set('Cookie', `civis_rt=${refreshAntigo}`);
    expect(reuso.status).toBe(401);

    // o agente (com o refresh novo) continua conseguindo renovar
    expect((await agente.post('/api/auth/refresh')).status).toBe(200);
  });

  it('sem cookie de refresh → 401', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });
});

describe('logout e revogação', () => {
  it('logout revoga a sessão: o access antigo para de funcionar na hora', async () => {
    const { agente, res } = await agenteLogado(USUARIOS_SEED.cliente.email);
    const access = cookieDe(res, 'civis_at') as string;

    const out = await agente.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect(([] as string[]).concat(out.headers['set-cookie']).join(';')).toMatch(/civis_at=;/);

    expect((await request(app).get('/api/auth/me').set(bearer(access))).status).toBe(401);
    expect((await agente.post('/api/auth/refresh')).status).toBe(401);
  });

  it('trocar a senha encerra as outras sessões e mantém a atual', async () => {
    const f = await novoFuncionario();
    const { agente: a1 } = await agenteLogado(f.email, f.senha);
    const { agente: a2 } = await agenteLogado(f.email, f.senha);

    const troca = await a1.put('/api/funcionarios/me/senha').send({ senhaAtual: f.senha, senhaNova: 'outraSenha9' });
    expect(troca.status).toBe(200);

    expect((await a1.get('/api/auth/me')).status).toBe(200);
    expect((await a2.get('/api/auth/me')).status).toBe(401);
  });

  it('rebaixar/promover (mudar o papel) encerra as sessões do funcionário', async () => {
    const f = await novoFuncionario('Administrador');
    const { agente } = await agenteLogado(f.email, f.senha);
    expect((await agente.get('/api/clientes')).status).toBe(200); // é admin

    const r = await request(app).put(`/api/funcionarios/${f.id}`).set(bearer(admin)).send({ cargo: 'Vistoriador' });
    expect(r.status).toBe(200);

    expect((await agente.get('/api/clientes')).status).toBe(401);
  });

  it('excluir o funcionário corta o acesso dele imediatamente', async () => {
    const f = await novoFuncionario();
    const { agente } = await agenteLogado(f.email, f.senha);
    expect((await agente.get('/api/funcionarios/me')).status).toBe(200);

    await request(app).delete(`/api/funcionarios/${f.id}`).set(bearer(admin)).send({ confirmacao: 'SIM' });

    expect((await agente.get('/api/funcionarios/me')).status).toBe(401);
  });

  it('usuário desativado perde o acesso mesmo com sessão aberta', async () => {
    const f = await novoFuncionario();
    const { agente } = await agenteLogado(f.email, f.senha);
    await sql`UPDATE usuario SET ativo = FALSE WHERE id = ${f.id}`;
    expect((await agente.get('/api/auth/me')).status).toBe(401);
    expect((await agente.post('/api/auth/refresh')).status).toBe(401);
  });
});

describe('CORS com credenciais', () => {
  it('libera a origem configurada com credenciais', async () => {
    const res = await request(app).get('/api/auth/me').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('não libera origem desconhecida', async () => {
    const res = await request(app).get('/api/auth/me').set('Origin', 'https://site-malicioso.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
