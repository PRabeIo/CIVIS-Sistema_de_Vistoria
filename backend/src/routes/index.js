const router = require('express').Router();

const auth = require('../middlewares/auth.middleware');
const { apenasCliente } = require('../middlewares/role.middleware');
const { apenasAdmin } = require('../middlewares/role.middleware');

// PUBLICO
router.use('/auth', require('./auth.routes'));

// ADMIN
router.use('/funcionarios', auth, apenasAdmin, require('./funcionario.routes'));
router.use('/administradores', auth, apenasAdmin, require('./administrador.routes'));
router.use('/empreendimentos', auth, apenasAdmin, require('./empreendimento.routes'));
router.use('/vistoriadores', auth, apenasAdmin, require('./vistoriador.routes'));


// LOGADOS
router.use('/clientes', auth, require('./cliente.routes'));
router.use('/vistorias', auth, require('./vistoria.routes'));
router.use('/relatorio', auth, require('./relatorio.routes'));
router.use('/imoveis', auth, require('./imovel.routes')); // ADMIN e CLIENTE (As permissões estão em imovel.routes)

module.exports = router;
