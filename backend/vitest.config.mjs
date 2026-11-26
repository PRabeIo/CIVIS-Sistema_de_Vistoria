import { defineConfig } from 'vitest/config';

// Banco de teste: serviço db-test do docker-compose (docker compose up -d db-test).
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://civis:civis@127.0.0.1:55433/civis_test';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/globalSetup.js'],
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      DATABASE_SSL: 'disable',
      JWT_SECRET: 'segredo-apenas-para-testes-com-32-caracteres',
      BCRYPT_SALT_ROUNDS: '4',
      // Os testes criam muitos cadastros; o limite de cadastro tem teste próprio.
      RATE_LIMIT_CADASTRO_MAX: '1000',
      // Nunca chamar a IA real nos testes: sem chave, o relatório usa o texto de fallback.
      GEMINI_API_KEY: '',
      STORAGE_DRIVER: 'local',
    },
    // Os testes compartilham um único banco: rodar arquivos em série evita interferência.
    fileParallelism: false,
  },
});
