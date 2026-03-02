const express = require('express');
const router = express.Router();

const administradorController = require('../controllers/administrador.controller');


/* REMOVIDOS:

router.post('/', administradorController.criarAdministrador);
router.put('/:idadministrador', administradorController.atualizarAdministrador);*/


// TALVEZ SEJAM REMOVIDOS TAMBÉM:
router.get('/', administradorController.listarAdministradores);
router.delete('/:idadministrador', administradorController.deletarAdministrador);

module.exports = router;
