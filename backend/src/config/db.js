require('dotenv').config();

const postgres = require('postgres');

// DATABASE_SSL: "require" (Supabase/produção) ou "disable" (Postgres local via Docker).
// Sem valor definido: desliga SSL para localhost e exige nos demais hosts.
function resolveSsl(url) {
  const mode = process.env.DATABASE_SSL;
  if (mode === 'disable') return false;
  if (mode === 'require') return 'require';
  return /@(localhost|127\.0\.0\.1)[:/]/.test(url || '') ? false : 'require';
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: resolveSsl(process.env.DATABASE_URL),
  onnotice: () => {},
});

module.exports = sql;
module.exports.resolveSsl = resolveSsl;
