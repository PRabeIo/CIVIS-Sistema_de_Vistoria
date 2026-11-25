/*
 * Runner de migrations mínimo (sem dependências além do `postgres`).
 * - Aplica, em ordem alfabética, os arquivos backend/migrations/*.sql ainda não aplicados.
 * - Cada arquivo roda numa transação e é registrado em public.schema_migrations.
 *
 * Uso: npm run migrate            (usa DATABASE_URL do .env)
 *      npm run migrate -- --reset (DERRUBA o schema public antes; só para dev/teste)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function migrate(sql, { reset = false, log = console.log } = {}) {
  if (reset) {
    await sql.unsafe('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    log('schema public recriado');
  }

  await sql`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      nome TEXT PRIMARY KEY,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const aplicadas = new Set((await sql`SELECT nome FROM public.schema_migrations`).map((r) => r.nome));
  const arquivos = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

  let count = 0;
  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) continue;
    const conteudo = fs.readFileSync(path.join(MIGRATIONS_DIR, arquivo), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(conteudo);
      await tx`INSERT INTO public.schema_migrations (nome) VALUES (${arquivo})`;
    });
    log(`aplicada: ${arquivo}`);
    count++;
  }
  if (count === 0) log('nenhuma migration pendente');
  return count;
}

module.exports = { migrate };

if (require.main === module) {
  const sql = require('../src/config/db');
  const reset = process.argv.includes('--reset');
  if (reset && process.env.NODE_ENV === 'production') {
    console.error('--reset não é permitido com NODE_ENV=production');
    process.exit(1);
  }
  migrate(sql, { reset })
    .then(() => sql.end())
    .catch(async (err) => {
      console.error('Falha na migration:', err.message);
      await sql.end();
      process.exit(1);
    });
}
