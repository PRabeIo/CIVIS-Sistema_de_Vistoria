// S8 (proteção de administradores + seed do primeiro admin) e S10 (validação do env).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import app from '../src/app.js';
import { seedAdmin } from '../src/cli/seed-admin';
import { carregarEnv, validarEnv } from '../src/config/env';
import sql from '../src/config/db.js';
import * as funcionarioService from '../src/services/funcionario.service';
import { USUARIOS_SEED } from '../scripts/seed';
import { tokenDe } from './helpers/auth';
import { gerarCpf, gerarEmail } from './helpers/dados';

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

let admin: string;
let idAdminSeed: number;

async function criarAdmin(): Promise<number> {
  const res = await request(app)
    .post('/api/funcionarios')
    .set(bearer(admin))
    .send({
      nome: 'Outro Admin',
      cpf: gerarCpf(),
      email: gerarEmail('admin'),
      senha: 'Senha1234',
      cargo: 'Administrador',
    });
  expect(res.status).toBe(201);
  return res.body.id;
}

/** Deixa só `idAtivo` como admin ativo durante `fn` e restaura os demais depois. */
async function comUnicoAdmin(idAtivo: number, fn: () => Promise<void>) {
  const outros = await sql<{ id: number }[]>`
    UPDATE usuario SET ativo = false WHERE papel = 'admin' AND ativo AND id <> ${idAtivo} RETURNING id
  `;
  try {
    await fn();
  } finally {
    if (outros.length) await sql`UPDATE usuario SET ativo = true WHERE id IN ${sql(outros.map((o) => o.id))}`;
  }
}

beforeAll(async () => {
  admin = await tokenDe('admin');
  [{ id: idAdminSeed }] = await sql<
    { id: number }[]
  >`SELECT id FROM usuario WHERE email = ${USUARIOS_SEED.admin.email}`;
});
afterAll(() => sql.end());

describe('S8: proteção de administradores', () => {
  it('admin não exclui a própria conta (409)', async () => {
    const res = await request(app)
      .delete(`/api/funcionarios/${idAdminSeed}`)
      .set(bearer(admin))
      .send({ confirmacao: 'SIM' });
    expect(res.status).toBe(409);
    expect(res.body.erro.codigo).toBe('ACAO_SOBRE_SI_MESMO');
  });

  it('admin não rebaixa a si mesmo (409)', async () => {
    const res = await request(app)
      .put(`/api/funcionarios/${idAdminSeed}`)
      .set(bearer(admin))
      .send({ cargo: 'Vistoriador' });
    expect(res.status).toBe(409);
    expect(res.body.erro.codigo).toBe('ACAO_SOBRE_SI_MESMO');
    const [u] = await sql`SELECT papel FROM usuario WHERE id = ${idAdminSeed}`;
    expect(u.papel).toBe('admin');
  });

  it('admin pode excluir e rebaixar outro admin', async () => {
    const a = await criarAdmin();
    const r1 = await request(app)
      .put(`/api/funcionarios/${a}`)
      .set(bearer(admin))
      .send({ cargo: 'Vistoriador' });
    expect(r1.status).toBe(200);
    expect(r1.body.cargo).toBe('Vistoriador');

    const b = await criarAdmin();
    const r2 = await request(app)
      .delete(`/api/funcionarios/${b}`)
      .set(bearer(admin))
      .send({ confirmacao: 'SIM' });
    expect(r2.status).toBe(200);
  });

  it('o último admin ativo não pode ser excluído nem rebaixado (409)', async () => {
    const ultimo = await criarAdmin();
    await comUnicoAdmin(ultimo, async () => {
      await expect(funcionarioService.deletar(ultimo)).rejects.toMatchObject({
        status: 409,
        codigo: 'ULTIMO_ADMIN',
      });
      await expect(funcionarioService.atualizar(ultimo, { cargo: 'Vistoriador' })).rejects.toMatchObject({
        status: 409,
        codigo: 'ULTIMO_ADMIN',
      });
    });
    const [u] = await sql`SELECT papel FROM usuario WHERE id = ${ultimo}`;
    expect(u.papel).toBe('admin');
  });

  it('excluir vistoriador continua funcionando', async () => {
    const res = await request(app)
      .post('/api/funcionarios')
      .set(bearer(admin))
      .send({
        nome: 'Vist',
        cpf: gerarCpf(),
        email: gerarEmail('vist'),
        senha: 'Senha1234',
        cargo: 'Vistoriador',
      });
    const del = await request(app)
      .delete(`/api/funcionarios/${res.body.id}`)
      .set(bearer(admin))
      .send({ confirmacao: 'SIM' });
    expect(del.status).toBe(200);
  });

  it('a rota duplicada /administradores não existe', async () => {
    const res = await request(app).delete(`/api/administradores/${idAdminSeed}`).set(bearer(admin));
    expect(res.status).toBe(404);
  });
});

describe('S8: npm run seed:admin', () => {
  const envAdmin = () => ({
    ADMIN_NOME: 'Primeiro Admin',
    ADMIN_EMAIL: gerarEmail('primeiro'),
    ADMIN_CPF: gerarCpf(),
    ADMIN_SENHA: 'SenhaForte123',
  });

  it('exige as variáveis ADMIN_*', async () => {
    await expect(seedAdmin({ ADMIN_NOME: 'X' })).rejects.toThrow(/ADMIN_EMAIL, ADMIN_CPF, ADMIN_SENHA/);
  });

  it('não faz nada se já existe admin', async () => {
    const env = envAdmin();
    expect(await seedAdmin(env)).toEqual({ criado: false, motivo: 'JA_EXISTE_ADMIN' });
    expect(await sql`SELECT 1 FROM usuario WHERE email = ${env.ADMIN_EMAIL}`).toHaveLength(0);
  });

  it('cria o admin quando não há nenhum (e ele consegue entrar)', async () => {
    const env = envAdmin();
    const admins = await sql<
      { id: number }[]
    >`UPDATE usuario SET papel = 'vistoriador' WHERE papel = 'admin' RETURNING id`;
    let criado: number | undefined;
    try {
      const r = await seedAdmin(env);
      expect(r).toMatchObject({ criado: true, email: env.ADMIN_EMAIL });
      if (r.criado) criado = r.id;
    } finally {
      await sql`UPDATE usuario SET papel = 'admin' WHERE id IN ${sql(admins.map((a) => a.id))}`;
    }
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: env.ADMIN_EMAIL, senha: env.ADMIN_SENHA });
    expect(login.status).toBe(200);
    expect(login.body.usuario.tipo).toBe('admin');
    await sql`DELETE FROM usuario WHERE id = ${criado!}`;
  });

  it('recusa dados inválidos com a mesma validação do cadastro', async () => {
    await expect(seedAdmin({ ...envAdmin(), ADMIN_SENHA: 'curta' })).rejects.toMatchObject({ status: 400 });
  });
});

describe('S10: validação do env', () => {
  const base = {
    DATABASE_URL: 'postgres://civis:civis@127.0.0.1:55432/civis',
    JWT_SECRET: 'x'.repeat(32),
  };
  const erros = (env: NodeJS.ProcessEnv) => {
    const r = validarEnv(env);
    return r.ok ? [] : r.erros;
  };

  it('aceita a configuração mínima e avisa sobre a IA desligada', () => {
    const r = validarEnv(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.avisos.join()).toMatch(/GEMINI_API_KEY/);
  });

  it('diz quais variáveis obrigatórias faltam', () => {
    expect(erros({})).toEqual(
      expect.arrayContaining(['DATABASE_URL: é obrigatória', 'JWT_SECRET: é obrigatória']),
    );
  });

  it('valor vazio conta como ausente', () => {
    expect(erros({ ...base, JWT_SECRET: '   ' })).toEqual(['JWT_SECRET: é obrigatória']);
  });

  it('JWT_SECRET curto é recusado', () => {
    expect(erros({ ...base, JWT_SECRET: 'sua_chave_jwt' })).toEqual([
      'JWT_SECRET: precisa ter pelo menos 32 caracteres',
    ]);
  });

  it('valida formatos e números', () => {
    const e = erros({
      ...base,
      DATABASE_URL: 'mysql://x',
      PORT: 'abc',
      BCRYPT_SALT_ROUNDS: '2',
      COOKIE_SECURE: 'sim',
    });
    expect(e.map((x) => x.split(':')[0]).sort()).toEqual([
      'BCRYPT_SALT_ROUNDS',
      'COOKIE_SECURE',
      'DATABASE_URL',
      'PORT',
    ]);
  });

  it('supabase exige URL e chave', () => {
    expect(erros({ ...base, STORAGE_DRIVER: 'supabase' })).toEqual([
      'SUPABASE_URL: é obrigatória com STORAGE_DRIVER=supabase',
      'SUPABASE_SERVICE_ROLE_KEY: é obrigatória com STORAGE_DRIVER=supabase',
    ]);
  });

  it('produção exige CORS_ORIGIN e cookie seguro', () => {
    const e = erros({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'false' });
    expect(e).toEqual([
      'CORS_ORIGIN: é obrigatória em produção (endereço do frontend)',
      'COOKIE_SECURE: não pode ser false em produção',
    ]);
  });

  it('o env dos testes é válido', () => {
    expect(validarEnv(process.env).ok).toBe(true);
  });

  it('carregarEnv encerra o processo listando o problema', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => carregarEnv({ DATABASE_URL: base.DATABASE_URL })).toThrow('process.exit');
      expect(exit).toHaveBeenCalledWith(1);
      expect(log.mock.calls[0][0]).toMatch(/JWT_SECRET: é obrigatória/);
    } finally {
      exit.mockRestore();
      log.mockRestore();
    }
  });
});
