const express = require('express');
const router = express.Router();

const vistoriadorController = require('../controllers/vistoriador.controller');

// GET: listar todos
router.get('/', vistoriadorController.listar);

// GET: buscar por id
router.get('/:id', vistoriadorController.buscarPorId);

// DELETE: remove o cargo de vistoriador
router.delete('/:id', vistoriadorController.deletar);

module.exports = router;
