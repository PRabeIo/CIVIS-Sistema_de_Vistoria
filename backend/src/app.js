const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { requestId, rotaNaoEncontrada, tratarErros } = require('./middlewares/erro.middleware');
const { cabecalhosSeguranca } = require('./middlewares/seguranca.middleware');

const app = express();

// S5: a sessão viaja em cookies; o CORS precisa liberar só as origens conhecidas, com credenciais.
// CORS_ORIGIN aceita uma lista separada por vírgula (ex.: "https://app.civis.com.br").
const origensPermitidas = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.set('trust proxy', process.env.TRUST_PROXY === 'true');
app.use(requestId);
app.use(cabecalhosSeguranca); // S4
app.disable('x-powered-by');
app.use(cors({ origin: origensPermitidas, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Servir arquivos estáticos (AGORA apontando sempre pra backend/uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// S2: relatórios NÃO são servidos estaticamente; ver GET /api/vistorias/:id/relatorio.

// Rotas da API
app.use('/api', require('./routes'));
app.use('/api', rotaNaoEncontrada);

// S7: tratamento central de erros (sempre por último)
app.use(tratarErros);

module.exports = app;
