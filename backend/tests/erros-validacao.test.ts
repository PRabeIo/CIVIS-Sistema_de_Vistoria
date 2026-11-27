// S1 (sem hash nas respostas), S7 (formato de erro e 500 genérico) e S9 (validação/normalização).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import sql from '../src/config/db.js';
import { tokenDe } from './helpers/auth';
import { comMascara, gerarCpf, gerarEmail } from './helpers/dados';

let admin: string;
let cliente: string;

beforeAll(async () => {
  [admin, cliente] = await Promise.all([tokenDe('admin'), tokenDe('cliente')]);
});
afterAll(() => sql.end());

const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Formato padrão: { erro: { codigo, mensagem } }, sem o legado `error` (B3) e nunca `detalhes`. */
function esperarErro(res: request.Response, status: number, codigo: string) {
  expect(res.status).toBe(status);
  expect(res.body.erro).toMatchObject({ codigo, mensagem: expect.any(String) });
  expect(res.body).not.toHaveProperty('error');
  expect(res.body).not.toHaveProperty('detalhes');
}

describe('S1 – nenhuma resposta expõe senha', () => {
  it.each([
    '/api/clientes',
    '/api/funcionarios',
    '/api/vistoriadores',
  ])('GET %s', async (url) => {
    const res = await request(app).get(url).set(comToken(admin));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/senha/i);
  });

  it('GET /funcionarios/:id e /clientes/:id', async () => {
    const [{ id: idFunc }] = await sql`SELECT id FROM funcionario LIMIT 1`;
    const [{ idcliente }] = await sql`SELECT idcliente FROM cliente LIMIT 1`;
    for (const url of [`/api/funcionarios/${idFunc}`, `/api/clientes/${idcliente}`]) {
      const res = await request(app).get(url).set(comToken(admin));
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toMatch(/senha/i);
    }
  });
});

describe('S7 – tratamento central de erros', () => {
  it('JSON malformado → 400 JSON_INVALIDO', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    esperarErro(res, 400, 'JSON_INVALIDO');
  });

  it('rota inexistente da API → 404 NAO_ENCONTRADO', async () => {
    const res = await request(app).get('/api/nao-existe').set(comToken(admin));
    esperarErro(res, 404, 'NAO_ENCONTRADO');
  });

  it('erro de banco vira 500 genérico, sem SQL, com id de rastreio', async () => {
    // id acima do limite de INTEGER: o Postgres falha com "out of range"
    const res = await request(app).get('/api/vistorias/99999999999').set(comToken(admin));
    esperarErro(res, 500, 'ERRO_INTERNO');
    expect(JSON.stringify(res.body)).not.toMatch(/integer|range|select|postgres/i);
    expect(res.body.erro.requestId).toBe(res.headers['x-request-id']);
  });

  it('404 de negócio mantém mensagem clara', async () => {
    const res = await request(app).get('/api/clientes/999999').set(comToken(admin));
    esperarErro(res, 404, 'NAO_ENCONTRADO');
    expect(res.body.erro.mensagem).toBe('Cliente não encontrado.');
  });
});

describe('S9 – validação e normalização', () => {
  const base = () => ({ nome: 'Pessoa Teste', cpf: gerarCpf(), email: gerarEmail(), senha: 'senhaForte1', aceiteTermos: true });

  it('CPF inválido → 400 com erro no campo', async () => {
    const res = await request(app)
      .post('/api/clientes/cadastro')
      .send({ ...base(), cpf: '123.456.789-00' });
    esperarErro(res, 400, 'VALIDACAO');
    expect(res.body.erro.campos.cpf).toBe('CPF inválido.');
  });

  it('normaliza CPF, telefone e e-mail antes de salvar', async () => {
    const cpf = gerarCpf();
    const email = gerarEmail('Maiusculo');
    const res = await request(app)
      .post('/api/clientes/cadastro')
      .send({ ...base(), cpf: comMascara(cpf), email: `  ${email.toUpperCase()} `, telefone: '(11) 91234-5678' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ cpf, email: email.toLowerCase(), telefone: '11912345678' });
  });

  it.each([
    ['curta', 'abc1', /pelo menos 8/],
    ['sem número', 'somenteletras', /letras e números/],
    ['sem letra', '12345678', /letras e números/],
  ])('senha %s → 400', async (_caso, senha, mensagem) => {
    const res = await request(app).post('/api/clientes/cadastro').send({ ...base(), senha });
    esperarErro(res, 400, 'VALIDACAO');
    expect(res.body.erro.mensagem).toMatch(mensagem);
  });

  it('política de senha vale também para funcionário', async () => {
    const res = await request(app)
      .post('/api/funcionarios')
      .set(comToken(admin))
      .send({ ...base(), senha: 'fraca', cargo: 'Vistoriador' });
    esperarErro(res, 400, 'VALIDACAO');
  });

  it('id não numérico na rota → 400', async () => {
    const res = await request(app).get('/api/clientes/abc').set(comToken(admin));
    esperarErro(res, 400, 'VALIDACAO');
  });

  it('agendamento com hora inválida → 400', async () => {
    const [{ idvistoria }] = await sql`SELECT idvistoria FROM vistoria LIMIT 1`;
    const res = await request(app)
      .put(`/api/vistorias/${idvistoria}/agendar`)
      .set(comToken(cliente))
      .send({ dataagendada: '2030-01-10', horaagendada: '25:00' });
    esperarErro(res, 400, 'VALIDACAO');
  });

  it('login sem senha → 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@civis.test' });
    esperarErro(res, 400, 'VALIDACAO');
  });

  it('exclusão exige confirmação "SIM"', async () => {
    const [{ idcliente }] = await sql`SELECT idcliente FROM cliente LIMIT 1`;
    const res = await request(app).delete(`/api/clientes/${idcliente}`).set(comToken(admin)).send({ confirmacao: 'nao' });
    esperarErro(res, 400, 'VALIDACAO');
  });
});
