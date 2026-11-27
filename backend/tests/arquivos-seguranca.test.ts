// S2 (relatório privado), S3 (uploads seguros) e S4 (cabeçalhos e limite de tentativas).
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import sql from '../src/config/db.js';
import { STORAGE_LOCAL_DIR } from '../src/services/storage.service';
import { UPLOADS_DIR } from '../src/utils/upload';
import { SENHA_PADRAO, USUARIOS_SEED } from '../scripts/seed';
import { cookieDe, tokenDe } from './helpers/auth';
import { gerarCpf, gerarEmail } from './helpers/dados';

// PNG válido de 1x1 pixel
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const UUID_ARQUIVO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/;

let admin: string;
let cliente: string;
let vistoriador: string;
const avataresCriados: string[] = [];

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const arquivosEm = (pasta: string) => (fs.existsSync(pasta) ? fs.readdirSync(pasta) : []);

beforeAll(async () => {
  [admin, cliente, vistoriador] = await Promise.all([tokenDe('admin'), tokenDe('cliente'), tokenDe('vistoriador')]);
});

afterAll(async () => {
  for (const f of avataresCriados) fs.rmSync(path.join(UPLOADS_DIR, 'clientes', f), { force: true });
  await sql.end();
});

describe('S4 – cabeçalhos de segurança', () => {
  it('aplica helmet e esconde o X-Powered-By', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-site');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('6ª tentativa de login errada → 429', async () => {
    const email = gerarEmail('forca-bruta');
    for (let i = 0; i < 5; i++) {
      expect((await request(app).post('/api/auth/login').send({ email, senha: 'errada123' })).status).toBe(401);
    }
    const sexta = await request(app).post('/api/auth/login').send({ email, senha: 'errada123' });
    expect(sexta.status).toBe(429);
    expect(sexta.body.erro.codigo).toBe('MUITAS_TENTATIVAS');
  });

  it('o limite é por e-mail: outro usuário do mesmo IP continua entrando', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: USUARIOS_SEED.cliente.email, senha: SENHA_PADRAO });
    expect(res.status).toBe(200);
  });
});

describe('S3 – uploads seguros', () => {
  const pastaClientes = path.join(UPLOADS_DIR, 'clientes');

  it('aceita PNG válido e grava com nome UUID (nunca o nome original)', async () => {
    const res = await request(app)
      .put('/api/clientes/me/avatar')
      .set(bearer(cliente))
      .attach('imagemdeperfil', PNG, { filename: '../../meu avatar.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.imagemdeperfil).toMatch(UUID_ARQUIVO);
    avataresCriados.push(res.body.imagemdeperfil);
  });

  it('HTML disfarçado de PNG → 400 e o arquivo é apagado', async () => {
    const antes = arquivosEm(pastaClientes).length;
    const res = await request(app)
      .put('/api/clientes/me/avatar')
      .set(bearer(cliente))
      .attach('imagemdeperfil', Buffer.from('<html><script>alert(1)</script></html>'), {
        filename: 'foto.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('ARQUIVO_INVALIDO');
    await new Promise((r) => setTimeout(r, 50)); // a remoção é assíncrona
    expect(arquivosEm(pastaClientes).length).toBe(antes);
  });

  it('SVG → 400', async () => {
    const res = await request(app)
      .put('/api/clientes/me/avatar')
      .set(bearer(cliente))
      .attach('imagemdeperfil', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), {
        filename: 'x.svg',
        contentType: 'image/svg+xml',
      });
    expect(res.status).toBe(400);
  });

  it('arquivo acima do limite → 413', async () => {
    const grande = Buffer.concat([PNG.subarray(0, 8), Buffer.alloc(6 * 1024 * 1024)]);
    const res = await request(app)
      .put('/api/clientes/me/avatar')
      .set(bearer(cliente))
      .attach('imagemdeperfil', grande, { filename: 'g.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body.erro.codigo).toBe('ARQUIVO_GRANDE');
  });

  it('relatório recusa campo de arquivo desconhecido', async () => {
    const res = await request(app)
      .post('/api/relatorio/gerar')
      .set(bearer(vistoriador))
      .field('idVistoria', '1')
      .attach('qualquer_coisa', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });
});

describe('S2 – relatório privado', () => {
  let idVistoria: number;
  let idVistoriador: number;

  beforeAll(async () => {
    [{ id: idVistoriador }] = await sql`SELECT id FROM usuario WHERE email = ${USUARIOS_SEED.vistoriador.email}`;
    const [{ idcliente }] = await sql`SELECT id AS idcliente FROM usuario WHERE email = ${USUARIOS_SEED.cliente.email}`;
    const [{ idempreendimento }] = await sql`SELECT idempreendimento FROM empreendimento LIMIT 1`;
    const [{ idimovel }] = await sql`
      INSERT INTO imovel (descricao, numero, idcliente, idempreendimento)
      VALUES ('Imóvel do teste de relatório', '202', ${idcliente}, ${idempreendimento})
      RETURNING idimovel`;
    [{ idvistoria: idVistoria }] = await sql`
      INSERT INTO vistoria (idcliente, idimovel, idvistoriador, status, datahorainicio)
      VALUES (${idcliente}, ${idimovel}, ${idVistoriador}, 'Em Andamento', now())
      RETURNING idvistoria`;
  });

  it('vistoriador gera o relatório; o PDF vai para o storage privado com nome UUID', async () => {
    const res = await request(app)
      .post('/api/relatorio/gerar')
      .set(bearer(vistoriador))
      .field('idVistoria', String(idVistoria))
      .field('comodos', JSON.stringify({ sala: { Quantidade: '1', Estrutura: 'Bom', Pintura: 'Razoável' } }))
      .attach('anexos_sala', PNG, { filename: 'sala.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.url).toBe(`/vistorias/${idVistoria}/relatorio`);

    const [v] = await sql`SELECT status, relatorio_arquivo FROM vistoria WHERE idvistoria = ${idVistoria}`;
    expect(v.status).toBe('Aguardando Validação');
    expect(v.relatorio_arquivo).toMatch(new RegExp(`^relatorios/vistoria-${idVistoria}/[0-9a-f-]{36}\\.pdf$`));
    expect(fs.existsSync(path.join(STORAGE_LOCAL_DIR, v.relatorio_arquivo))).toBe(true);
  });

  it('cliente dono baixa o PDF pela API', async () => {
    const res = await request(app).get(`/api/vistorias/${idVistoria}/relatorio`).set(bearer(cliente)).buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['cache-control']).toContain('no-store');
    expect(Buffer.from(res.body).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('a vistoria expõe só o caminho protegido do relatório', async () => {
    const res = await request(app).get(`/api/vistorias/${idVistoria}`).set(bearer(cliente));
    expect(res.body.relatorio_url).toBe(`/vistorias/${idVistoria}/relatorio`);
    expect(JSON.stringify(res.body)).not.toMatch(/supabase|https?:\/\//i);
  });

  it('outro cliente não acessa (404) e sem sessão é 401', async () => {
    const outro = { nome: 'Outro Cliente', cpf: gerarCpf(), email: gerarEmail('outro'), senha: 'senhaForte1', aceiteTermos: true };
    await request(app).post('/api/clientes/cadastro').send(outro);
    const login = await request(app).post('/api/auth/login').send({ email: outro.email, senha: outro.senha });
    const tokenOutro = cookieDe(login, 'civis_at') as string;

    expect((await request(app).get(`/api/vistorias/${idVistoria}/relatorio`).set(bearer(tokenOutro))).status).toBe(404);
    expect((await request(app).get(`/api/vistorias/${idVistoria}/relatorio`)).status).toBe(401);
  });

  it('admin acessa; vistoria sem relatório → 404', async () => {
    expect((await request(app).get(`/api/vistorias/${idVistoria}/relatorio`).set(bearer(admin))).status).toBe(200);
    const [{ idvistoria: semRelatorio }] = await sql`SELECT idvistoria FROM vistoria WHERE relatorio_arquivo IS NULL LIMIT 1`;
    expect((await request(app).get(`/api/vistorias/${semRelatorio}/relatorio`).set(bearer(admin))).status).toBe(404);
  });

  it('não existe mais pasta pública de relatórios', async () => {
    const [{ relatorio_arquivo }] = await sql`SELECT relatorio_arquivo FROM vistoria WHERE idvistoria = ${idVistoria}`;
    const nome = path.basename(relatorio_arquivo);
    expect((await request(app).get(`/relatorios/${nome}`)).status).toBe(404);
  });
});
