/*
 * Seed de DADOS DE TESTE (DEC-4). Recria um conjunto mínimo para desenvolvimento e testes:
 * 1 administrador, 1 vistoriador, 1 cliente, 1 empreendimento, 1 imóvel e 1 vistoria.
 *
 * Senha de todos os usuários: SEED_PASSWORD (padrão abaixo). Só para ambiente local/teste.
 * Uso: npm run seed
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import type postgres from 'postgres';
import type { Papel } from '../src/domain/papel';

export const SENHA_PADRAO = 'Civis@teste123';

export const USUARIOS_SEED = {
  admin: { nome: 'Admin Teste', email: 'admin@civis.test', cpf: '12345678909', papel: 'admin' },
  vistoriador: {
    nome: 'Vistoriador Teste',
    email: 'vistoriador@civis.test',
    cpf: '98765432100',
    papel: 'vistoriador',
  },
  cliente: { nome: 'Cliente Teste', email: 'cliente@civis.test', cpf: '11144477735', papel: 'cliente' },
} as const satisfies Record<string, { nome: string; email: string; cpf: string; papel: Papel }>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Sql = postgres.Sql<{}>;

interface OpcoesSeed {
  senha?: string;
  log?: (msg: string) => void;
}

export async function seed(
  sql: Sql,
  { senha = process.env.SEED_PASSWORD || SENHA_PADRAO, log = console.log }: OpcoesSeed = {},
): Promise<void> {
  const hash = await bcrypt.hash(senha, Number(process.env.BCRYPT_SALT_ROUNDS) || 10);

  await sql.begin(async (trx) => {
    const tx = trx as unknown as Sql; // ver src/config/transacao.ts

    await tx`TRUNCATE vistoria, relatoriotecnico, imovel, empreendimento, cliente, funcionario, usuario
             RESTART IDENTITY CASCADE`;

    const ids = {} as Record<keyof typeof USUARIOS_SEED, number>;
    for (const [chave, u] of Object.entries(USUARIOS_SEED) as [keyof typeof USUARIOS_SEED, (typeof USUARIOS_SEED)[keyof typeof USUARIOS_SEED]][]) {
      const [{ id }] = await tx<{ id: number }[]>`
        INSERT INTO usuario (email, senha_hash, papel) VALUES (${u.email}, ${hash}, ${u.papel}) RETURNING id
      `;
      ids[chave] = id;
      if (u.papel === 'cliente') {
        await tx`INSERT INTO cliente (idcliente, nome, cpf) VALUES (${id}, ${u.nome}, ${u.cpf})`;
      } else {
        await tx`INSERT INTO funcionario (id, nome, cpf) VALUES (${id}, ${u.nome}, ${u.cpf})`;
      }
    }

    const [emp] = await tx<{ idempreendimento: number }[]>`
      INSERT INTO empreendimento (nome, construtora, cidade, estado, cep, rua)
      VALUES ('Residencial Teste', 'Construtora Teste', 'São Paulo', 'SP', '01000-000', 'Rua Teste, 100')
      RETURNING idempreendimento`;

    const [imo] = await tx<{ idimovel: number }[]>`
      INSERT INTO imovel (descricao, bloco, numero, idempreendimento, idcliente)
      VALUES ('Apartamento 2 quartos', 'A', '101', ${emp.idempreendimento}, ${ids.cliente})
      RETURNING idimovel`;

    await tx`INSERT INTO vistoria (idcliente, idimovel) VALUES (${ids.cliente}, ${imo.idimovel})`;
  });

  log('seed aplicado (admin, vistoriador, cliente, empreendimento, imóvel, vistoria)');
}

if (require.main === module) {
  if (process.env.NODE_ENV === 'production') {
    console.error('seed não pode rodar com NODE_ENV=production');
    process.exit(1);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sql: Sql = require('../src/config/db');
  seed(sql)
    .then(() => sql.end())
    .catch(async (err: Error) => {
      console.error('Falha no seed:', err.message);
      await sql.end();
      process.exit(1);
    });
}
