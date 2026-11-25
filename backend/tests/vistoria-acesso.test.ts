// Acesso a vistorias por papel (D1 trocou cargo/tipo por `papel` no token).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import sql from '../src/config/db.js';
import { tokenDe } from './helpers/auth';

let admin: string;
let cliente: string;
let vistoriador: string;
let idVistoria: number;

beforeAll(async () => {
  [admin, cliente, vistoriador] = await Promise.all([tokenDe('admin'), tokenDe('cliente'), tokenDe('vistoriador')]);
  [{ idvistoria: idVistoria }] = await sql`SELECT idvistoria FROM vistoria ORDER BY idvistoria LIMIT 1`;
});
afterAll(() => sql.end());

const get = (url: string, token: string) => request(app).get(url).set('Authorization', `Bearer ${token}`);

describe('GET /api/vistorias/:id', () => {
  it('admin vê qualquer vistoria', async () => {
    expect((await get(`/api/vistorias/${idVistoria}`, admin)).status).toBe(200);
  });

  it('cliente dono vê a própria vistoria', async () => {
    const res = await get(`/api/vistorias/${idVistoria}`, cliente);
    expect(res.status).toBe(200);
    expect(res.body.idvistoria).toBe(idVistoria);
  });

  it('vistoriador não vê vistoria que não é dele nem está disponível', async () => {
    // a vistoria do seed está "Aguardando Agendamento", então não aparece para vistoriador
    expect((await get(`/api/vistorias/${idVistoria}`, vistoriador)).status).toBe(404);
  });
});

describe('listas por papel', () => {
  it('cliente lista as suas vistorias', async () => {
    const res = await get('/api/vistorias/minhas', cliente);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('vistoriador lista as disponíveis; cliente não pode', async () => {
    expect((await get('/api/vistorias/disponiveis', vistoriador)).status).toBe(200);
    expect((await get('/api/vistorias/disponiveis', cliente)).status).toBe(403);
  });
});
