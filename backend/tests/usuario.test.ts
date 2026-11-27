// D1: identidade única em `usuario` (login, e-mail único entre papéis, perfis 1:1, papel no token).
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import sql from '../src/config/db.js';
import { SENHA_PADRAO, USUARIOS_SEED } from '../scripts/seed';
import { cookieDe, tokenDe } from './helpers/auth';
import { comMascara, gerarCpf } from './helpers/dados';

let admin: string;

beforeAll(async () => {
  admin = await tokenDe('admin');
});
afterAll(() => sql.end());

function login(email: string, senha: string) {
  return request(app).post('/api/auth/login').send({ email, senha });
}

function semSegredos(obj: Record<string, unknown>) {
  expect(obj).not.toHaveProperty('senha');
  expect(obj).not.toHaveProperty('senha_hash');
}

describe('login unificado', () => {
  it.each(['admin', 'vistoriador', 'cliente'] as const)('autentica %s e abre uma sessão', async (papel) => {
    const res = await login(USUARIOS_SEED[papel].email, SENHA_PADRAO);
    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ tipo: papel, nome: USUARIOS_SEED[papel].nome });

    const payload = jwt.decode(cookieDe(res, 'civis_at') as string) as unknown as { sub: number; sid: string };
    expect(payload.sub).toBe(res.body.usuario.id);
    const [s] = await sql`SELECT usuario_id, revogada_em FROM sessao WHERE id = ${payload.sid}`;
    expect(s).toMatchObject({ usuario_id: res.body.usuario.id, revogada_em: null });
  });

  it('e-mail não diferencia maiúsculas', async () => {
    const res = await login(USUARIOS_SEED.admin.email.toUpperCase(), SENHA_PADRAO);
    expect(res.status).toBe(200);
  });

  it('registra o último login', async () => {
    await sql`UPDATE usuario SET ultimo_login_em = NULL WHERE email = ${USUARIOS_SEED.cliente.email}`;
    await login(USUARIOS_SEED.cliente.email, SENHA_PADRAO);
    const [u] = await sql`SELECT ultimo_login_em FROM usuario WHERE email = ${USUARIOS_SEED.cliente.email}`;
    expect(u.ultimo_login_em).toBeInstanceOf(Date);
  });

  it('usuário desativado não entra (403)', async () => {
    await sql`UPDATE usuario SET ativo = FALSE WHERE email = ${USUARIOS_SEED.vistoriador.email}`;
    try {
      const res = await login(USUARIOS_SEED.vistoriador.email, SENHA_PADRAO);
      expect(res.status).toBe(403);
      expect(cookieDe(res, 'civis_at')).toBeNull();
    } finally {
      await sql`UPDATE usuario SET ativo = TRUE WHERE email = ${USUARIOS_SEED.vistoriador.email}`;
    }
  });

  it('recusa token antigo (sem sessão) com 401', async () => {
    const antigo = jwt.sign({ sub: 1, tipo: 'admin', cargo: 'Administrador' }, process.env.JWT_SECRET as string);
    const res = await request(app).get('/api/clientes').set('Authorization', `Bearer ${antigo}`);
    expect(res.status).toBe(401);
  });
});

describe('cadastro de cliente', () => {
  const novo = { nome: 'Novo Cliente', cpf: comMascara(gerarCpf()), email: 'novo.cliente@civis.test', senha: 'senhaForte1', aceiteTermos: true };

  it('cadastro público cria usuário + perfil e permite login', async () => {
    const res = await request(app).post('/api/clientes/cadastro').send(novo);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: novo.nome, email: novo.email });
    semSegredos(res.body);

    const [u] = await sql`SELECT papel FROM usuario WHERE id = ${res.body.idcliente}`;
    expect(u.papel).toBe('cliente');

    const l = await login(novo.email, novo.senha);
    expect(l.status).toBe(200);
    expect(l.body.usuario.tipo).toBe('cliente');
  });

  it('e-mail é único entre todos os papéis (cliente com e-mail de funcionário → 409)', async () => {
    const res = await request(app)
      .post('/api/clientes/cadastro')
      .send({ ...novo, cpf: gerarCpf(), email: USUARIOS_SEED.admin.email });
    expect(res.status).toBe(409);
    expect(res.body.erro.mensagem).toMatch(/email/i);
  });

  it('CPF duplicado → 409 e não deixa usuário órfão', async () => {
    const email = 'cpf.duplicado@civis.test';
    const res = await request(app).post('/api/clientes/cadastro').send({ ...novo, email });
    expect(res.status).toBe(409);
    const orfaos = await sql`SELECT 1 FROM usuario WHERE email = ${email}`;
    expect(orfaos).toHaveLength(0);
  });

  it('senha curta → 400', async () => {
    const res = await request(app)
      .post('/api/clientes/cadastro')
      .send({ ...novo, cpf: gerarCpf(), email: 'curta@civis.test', senha: '123' });
    expect(res.status).toBe(400);
  });

  it('listagem do admin não expõe senha', async () => {
    const res = await request(app).get('/api/clientes').set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach(semSegredos);
  });

  it('excluir cliente remove também o usuário', async () => {
    const criado = await request(app)
      .post('/api/clientes/cadastro')
      .send({ ...novo, cpf: gerarCpf(), email: 'excluir@civis.test' });
    const id = criado.body.idcliente;

    const res = await request(app)
      .delete(`/api/clientes/${id}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ confirmacao: 'SIM' });
    expect(res.status).toBe(200);
    expect(await sql`SELECT 1 FROM usuario WHERE id = ${id}`).toHaveLength(0);
  });
});

describe('funcionários e papel', () => {
  it('admin cria vistoriador, troca o cargo para Administrador e o papel muda', async () => {
    const dados = {
      nome: 'Vist Novo',
      cpf: gerarCpf(),
      email: 'vist.novo@civis.test',
      senha: 'senhaForte1',
      cargo: 'Vistoriador',
    };
    const criado = await request(app).post('/api/funcionarios').set('Authorization', `Bearer ${admin}`).send(dados);
    expect(criado.status).toBe(201);
    expect(criado.body).toMatchObject({ cargo: 'Vistoriador', papel: 'vistoriador' });
    semSegredos(criado.body);

    const lista = await request(app).get('/api/vistoriadores').set('Authorization', `Bearer ${admin}`);
    expect(lista.body.map((v: { idvistoriador: number }) => v.idvistoriador)).toContain(criado.body.id);

    const promovido = await request(app)
      .put(`/api/funcionarios/${criado.body.id}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ cargo: 'Administrador' });
    expect(promovido.status).toBe(200);
    expect(promovido.body.cargo).toBe('Administrador');

    const l = await login(dados.email, dados.senha);
    expect(l.body.usuario.tipo).toBe('admin');
  });

  it('cargo inválido → 400', async () => {
    const res = await request(app)
      .post('/api/funcionarios')
      .set('Authorization', `Bearer ${admin}`)
      .send({ nome: 'X', cpf: gerarCpf(), email: 'x@civis.test', senha: 'senhaForte1', cargo: 'Cliente' });
    expect(res.status).toBe(400);
  });

  it('/me devolve o perfil de cada papel', async () => {
    const vist = await tokenDe('vistoriador');
    const cli = await tokenDe('cliente');

    const f = await request(app).get('/api/funcionarios/me').set('Authorization', `Bearer ${vist}`);
    expect(f.status).toBe(200);
    expect(f.body).toMatchObject({ email: USUARIOS_SEED.vistoriador.email, cargo: 'Vistoriador' });

    const c = await request(app).get('/api/clientes/me').set('Authorization', `Bearer ${cli}`);
    expect(c.status).toBe(200);
    expect(c.body).toMatchObject({ email: USUARIOS_SEED.cliente.email });

    // cliente não acessa rota de funcionário e vice-versa
    expect((await request(app).get('/api/funcionarios/me').set('Authorization', `Bearer ${cli}`)).status).toBe(403);
    expect((await request(app).get('/api/clientes/me').set('Authorization', `Bearer ${vist}`)).status).toBe(403);
  });

  it('troca de senha exige a senha atual', async () => {
    const vist = await tokenDe('vistoriador');
    const errada = await request(app)
      .put('/api/funcionarios/me/senha')
      .set('Authorization', `Bearer ${vist}`)
      .send({ senhaAtual: 'errada', senhaNova: 'novaSenha123' });
    expect(errada.status).toBe(400);

    const ok = await request(app)
      .put('/api/funcionarios/me/senha')
      .set('Authorization', `Bearer ${vist}`)
      .send({ senhaAtual: SENHA_PADRAO, senhaNova: 'novaSenha123' });
    expect(ok.status).toBe(200);
    expect((await login(USUARIOS_SEED.vistoriador.email, 'novaSenha123')).status).toBe(200);

    // restaura para os outros testes
    await request(app)
      .put('/api/funcionarios/me/senha')
      .set('Authorization', `Bearer ${vist}`)
      .send({ senhaAtual: 'novaSenha123', senhaNova: SENHA_PADRAO });
  });
});
