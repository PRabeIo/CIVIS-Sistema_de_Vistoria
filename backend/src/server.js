require('dns').setDefaultResultOrder('ipv4first');
process.env.TZ = 'America/Sao_Paulo';

require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3001;

const { initEmail } = require('./services/email.service');

(async () => {
  await initEmail();
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
})();

