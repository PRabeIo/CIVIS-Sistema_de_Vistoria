// Bugs da Fase 1 (B3, B6, B7, B11, B12, B14) cobertos pela API.
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import sql from '../src/config/db.js';
import { STORAGE_LOCAL_DIR } from '../src/services/storage.service';
import { USUARIOS_SEED } from '../scripts/seed';
import { loginComo, tokenDe } from './helpers/auth';
import { gerarCpf, gerarEmail } from './helpers/dados';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
// Cabeçalho válido de WebP (o conteúdo não importa: o tipo é recusado antes)
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(16)]);

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

let admin: string;
let cliente: string;
let vistoriador: string;
let idCliente: number;
let idVistoriador: number;
let idEmpreendimento: number;

async function novoImovel(): Promise<number> {
  const [{ idimovel }] = await sql`
    INSERT INTO imovel (descricao, numero, idcliente, idempreendimento)
    VALUES ('Imóvel de teste (bugs)', '1', ${idCliente}, ${idEmpreendimento})
    RETURNING idimovel`;
  return idimovel;
}

async function novaVistoria(idimovel: number, status: string, comVistoriador = false): Promise<number> {
  const [{ idvistoria }] = await sql`
    INSERT INTO vistoria (idcliente, idimovel, idvistoriador, status, datahorainicio)
    VALUES (${idCliente}, ${idimovel}, ${comVistoriador ? idVistoriador : null}, ${status},
            ${status === 'Em Andamento' ? sql`'2026-03-10T09:30:00-03:00'::timestamptz` : null})
    RETURNING idvistoria`;
  return idvistoria;
}

beforeAll(async () => {
  [admin, cliente, vistoriador] = await Promise.all([tokenDe('admin'), tokenDe('cliente'), tokenDe('vistoriador')]);
  [{ id: idCliente }] = await sql`SELECT id FROM usuario WHERE email = ${USUARIOS_SEED.cliente.email}`;
  [{ id: idVistoriador }] = await sql`SELECT id FROM usuario WHERE email = ${USUARIOS_SEED.vistoriador.email}`;
  [{ idempreendimento: idEmpreendimento }] = await sql`SELECT idempreendimento FROM empreendimento LIMIT 1`;
});
afterAll(async () => {
  await sql`UPDATE funcionario SET assinatura = NULL, assinatura_tipo = NULL WHERE id = ${idVistoriador}`;
  await sql.end();
});

describe('B3: formato único de erro', () => {
  it('o campo legado "error" saiu da resposta', async () => {
    const res = await request(app).get('/api/rota-que-nao-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Rota não encontrada.' } });
  });

  it('403 de papel também usa o formato padrão', async () => {
    const res = await request(app).get('/api/funcionarios').set(bearer(cliente));
    expect(res.status).toBe(403);
    expect(res.body.erro).toMatchObject({ codigo: 'PROIBIDO', mensagem: expect.stringContaining('administradores') });
  });
});

describe('B6: imóvel por id e exclusão', () => {
  it('admin busca o imóvel por id', async () => {
    const id = await novoImovel();
    const res = await request(app).get(`/api/imoveis/${id}`).set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ idimovel: id, numero: '1', idcliente: idCliente });
    expect(res.body.nomeempreendimento).toBeTruthy();
  });

  it('exclui imóvel cuja vistoria ainda não começou (a vistoria sai junto)', async () => {
    const id = await novoImovel();
    const v = await novaVistoria(id, 'Aguardando Agendamento da Vistoria');
    const res = await request(app).delete(`/api/imoveis/${id}`).set(bearer(admin));
    expect(res.status).toBe(200);
    expect(await sql`SELECT 1 FROM imovel WHERE idimovel = ${id}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM vistoria WHERE idvistoria = ${v}`).toHaveLength(0);
  });

  it.each(['Em Andamento', 'Aguardando Validação', 'Vistoria Validada'])('bloqueia com vistoria "%s" (409)', async (status) => {
    const id = await novoImovel();
    await novaVistoria(id, status, true);
    const res = await request(app).delete(`/api/imoveis/${id}`).set(bearer(admin));
    expect(res.status).toBe(409);
    expect(res.body.erro.codigo).toBe('IMOVEL_COM_HISTORICO');
    expect(await sql`SELECT 1 FROM imovel WHERE idimovel = ${id}`).toHaveLength(1);
  });

  it('404 para imóvel inexistente e 403 para não-admin', async () => {
    expect((await request(app).delete('/api/imoveis/999999').set(bearer(admin))).status).toBe(404);
    const id = await novoImovel();
    expect((await request(app).delete(`/api/imoveis/${id}`).set(bearer(cliente))).status).toBe(403);
  });
});

describe('B7: listagem de vistorias do admin', () => {
  it('traz cliente, imóvel e empreendimento, sem expor a chave do storage', async () => {
    const id = await novoImovel();
    const v = await novaVistoria(id, 'Vistoria Agendada');
    const res = await request(app).get('/api/vistorias').set(bearer(admin));
    expect(res.status).toBe(200);
    const item = res.body.find((x: { idvistoria: number }) => x.idvistoria === v);
    expect(item).toMatchObject({ status: 'Vistoria Agendada', nomecliente: USUARIOS_SEED.cliente.nome, numero: '1' });
    expect(item.nomeempreendimento).toBeTruthy();
    expect(item).not.toHaveProperty('relatorio_arquivo');
  });
});

describe('B11: falha no storage não avança a vistoria', () => {
  it('responde 502 e a vistoria continua "Em Andamento"', async () => {
    const id = await novaVistoria(await novoImovel(), 'Em Andamento', true);
    const antes = { ...process.env };
    // storage remoto inacessível (porta fechada): o envio do PDF falha
    Object.assign(process.env, {
      STORAGE_DRIVER: 'supabase',
      SUPABASE_URL: 'http://127.0.0.1:9',
      SUPABASE_SERVICE_ROLE_KEY: 'chave-de-teste',
    });
    try {
      const res = await request(app)
        .post('/api/relatorio/gerar')
        .set(bearer(vistoriador))
        .field('idVistoria', String(id))
        .field('comodos', JSON.stringify({ sala: { Quantidade: '1', Estrutura: 'Bom' } }));
      expect(res.status).toBe(502);
      expect(res.body.erro.codigo).toBe('STORAGE_INDISPONIVEL');
    } finally {
      process.env = antes;
    }
    const [v] = await sql`SELECT status, relatorio_arquivo FROM vistoria WHERE idvistoria = ${id}`;
    expect(v).toMatchObject({ status: 'Em Andamento', relatorio_arquivo: null });
  });
});

describe('B12: assinatura do vistoriador e fotos do relatório', () => {
  it('cadastra, lê e remove a assinatura (só PNG/JPEG)', async () => {
    const webp = await request(app)
      .put('/api/funcionarios/me/assinatura')
      .set(bearer(vistoriador))
      .attach('assinatura', WEBP, { filename: 'a.webp', contentType: 'image/webp' });
    expect(webp.status).toBe(400);

    const put = await request(app)
      .put('/api/funcionarios/me/assinatura')
      .set(bearer(vistoriador))
      .attach('assinatura', PNG, { filename: 'assinatura.png', contentType: 'image/png' });
    expect(put.status).toBe(200);

    const me = await request(app).get('/api/funcionarios/me').set(bearer(vistoriador));
    expect(me.body.tem_assinatura).toBe(true);
    expect(me.body).not.toHaveProperty('assinatura');

    const get = await request(app).get('/api/funcionarios/me/assinatura').set(bearer(vistoriador));
    expect(get.status).toBe(200);
    expect(get.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(get.body, PNG)).toBe(0);

    expect((await request(app).delete('/api/funcionarios/me/assinatura').set(bearer(vistoriador))).status).toBe(200);
    expect((await request(app).get('/api/funcionarios/me/assinatura').set(bearer(vistoriador))).status).toBe(404);
  });

  it('só vistoriador tem assinatura', async () => {
    expect((await request(app).get('/api/funcionarios/me/assinatura').set(bearer(admin))).status).toBe(403);
  });

  it('gera o relatório com a assinatura cadastrada', async () => {
    await request(app)
      .put('/api/funcionarios/me/assinatura')
      .set(bearer(vistoriador))
      .attach('assinatura', PNG, { filename: 'assinatura.png', contentType: 'image/png' });
    const id = await novaVistoria(await novoImovel(), 'Em Andamento', true);
    const res = await request(app)
      .post('/api/relatorio/gerar')
      .set(bearer(vistoriador))
      .field('idVistoria', String(id))
      .field('comodos', JSON.stringify({ sala: { Quantidade: '1', Estrutura: 'Bom' } }));
    expect(res.status).toBe(200);
    const [v] = await sql`SELECT relatorio_arquivo FROM vistoria WHERE idvistoria = ${id}`;
    const pdf = fs.readFileSync(path.join(STORAGE_LOCAL_DIR, v.relatorio_arquivo));
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.includes('/Subtype /Image')).toBe(true); // a assinatura entrou no PDF
  });

  it('foto WebP no relatório é recusada (o PDF só desenha JPEG/PNG)', async () => {
    const res = await request(app)
      .post('/api/relatorio/gerar')
      .set(bearer(vistoriador))
      .field('idVistoria', '1')
      .attach('anexos_sala', WEBP, { filename: 'sala.webp', contentType: 'image/webp' });
    expect(res.status).toBe(400);
    expect(res.body.erro.mensagem).toBe('Formato de arquivo não permitido. Envie imagens JPEG ou PNG.');
  });
});

describe('B14: edição de cliente pelo admin', () => {
  let id: number;
  const email = gerarEmail('b14');

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set(bearer(admin))
      .send({ nome: 'Cliente B14', cpf: gerarCpf(), email, senha: 'Senha1234', telefone: '11988887777' });
    expect(res.status).toBe(201);
    id = res.body.idcliente;
  });

  it('atualiza só o nome (sem telefone/senha) sem erro e sem apagar o resto', async () => {
    const res = await request(app).put(`/api/clientes/${id}`).set(bearer(admin)).send({ nome: 'Cliente B14 Editado' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nome: 'Cliente B14 Editado', telefone: '11988887777', email });
  });

  it('campos vazios do formulário contam como "não alterar"', async () => {
    const res = await request(app)
      .put(`/api/clientes/${id}`)
      .set(bearer(admin))
      .send({ nome: 'Cliente B14 Editado', telefone: '', senha: '' });
    expect(res.status).toBe(200);
    expect(res.body.telefone).toBe('11988887777');
  });

  it('admin pode redefinir a senha', async () => {
    const res = await request(app).put(`/api/clientes/${id}`).set(bearer(admin)).send({ senha: 'NovaSenha99' });
    expect(res.status).toBe(200);
    expect((await loginComo(email, 'NovaSenha99')).status).toBe(200);
  });
});
