const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (AGORA apontando sempre pra backend/uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Se "relatorios" também ficar fora de src (backend/relatorios)
app.use('/relatorios', express.static(path.join(__dirname, '..', 'relatorios')));

// Rotas da API
app.use('/api', require('./routes'));

module.exports = app;
