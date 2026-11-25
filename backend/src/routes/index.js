// backend/src/routes/index.js
const router = require('express').Router();

const auth = require('../middlewares/auth.middleware');
const { apenasAdmin } = require('../middlewares/role.middleware');

// PUBLICO
router.use('/auth', require('./auth.routes'));

// FUNCIONÁRIOS (LOGADOS) — permissões por rota dentro de funcionario.routes
router.use('/funcionarios', auth, require('./funcionario.routes'));

// ADMIN
router.use('/empreendimentos', auth, apenasAdmin, require('./empreendimento.routes'));
router.use('/vistoriadores', auth, apenasAdmin, require('./vistoriador.routes'));

// LOGADOS
router.use('/clientes', require('./cliente.routes'));
router.use('/vistorias', auth, require('./vistoria.routes'));
router.use('/relatorio', auth, require('./relatorio.routes'));
router.use('/imoveis', auth, require('./imovel.routes')); // ADMIN e CLIENTE (permissões estão em imovel.routes)

module.exports = router;