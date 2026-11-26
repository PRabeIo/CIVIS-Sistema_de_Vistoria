require('dns').setDefaultResultOrder('ipv4first');
process.env.TZ = 'America/Sao_Paulo';

require('dotenv').config();

// S10: valida o env antes de carregar o resto (encerra com a lista do que falta).
require('./config/env').carregarEnv();

const app = require('./app');

const PORT = process.env.PORT || 3001;

const { initEmail } = require('./services/email.service');

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// B13: o e-mail é opcional para subir a API. Se o provedor (Ethereal em dev) falhar ou demorar,
// o servidor segue no ar e só o envio de e-mails fica indisponível.
initEmail().catch((err) => {
  console.warn('[email] envio de e-mails indisponível:', err?.message || err);
});

