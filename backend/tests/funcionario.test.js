import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import sql from '../src/config/db.js';
import { USUARIOS_SEED } from '../scripts/seed';
import { tokenDe } from './helpers/auth.js';

let admin;
let idVistoriador;

beforeAll(async () => {
  admin = await tokenDe('admin');
  [{ id: idVistoriador }] = await sql`SELECT id FROM usuario WHERE email = ${USUARIOS_SEED.vistoriador.email}`;
});
afterAll(() => sql.end());

describe('PUT /api/funcionarios/:id', () => {
  it('atualiza o funcionário e não devolve a senha', async () => {
    const res = await request(app)
      .put(`/api/funcionarios/${idVistoriador}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ telefone: '(11) 99999-0000' });

    expect(res.status).toBe(200);
    expect(res.body.telefone).toBe('(11) 99999-0000');
    expect(res.body).not.toHaveProperty('senha');
  });

  it('responde 404 para funcionário inexistente', async () => {
    const res = await request(app)
      .put('/api/funcionarios/999999')
      .set('Authorization', `Bearer ${admin}`)
      .send({ telefone: '1' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/vistoriadores/:id', () => {
  it('devolve o vistoriador', async () => {
    const res = await request(app)
      .get(`/api/vistoriadores/${idVistoriador}`)
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ idvistoriador: idVistoriador, email: USUARIOS_SEED.vistoriador.email });
  });
});
