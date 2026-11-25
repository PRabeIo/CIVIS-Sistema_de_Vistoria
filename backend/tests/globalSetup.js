// Recria o schema do banco de teste a partir das migrations e aplica o seed antes da suíte.
export default async function setup({ config }) {
  Object.assign(process.env, config.env);
  const postgres = (await import('postgres')).default;
  const { migrate } = await import('../scripts/migrate.js');
  const { seed } = await import('../scripts/seed');

  const sql = postgres(process.env.DATABASE_URL, { ssl: false, onnotice: () => {} });
  try {
    await migrate(sql, { reset: true, log: () => {} });
    await seed(sql, { log: () => {} });
  } catch (err) {
    throw new Error(
      `Não foi possível preparar o banco de teste (${process.env.DATABASE_URL}). ` +
        `Rode "docker compose up -d db-test". Erro original: ${err.message}`,
    );
  } finally {
    await sql.end();
  }
}
