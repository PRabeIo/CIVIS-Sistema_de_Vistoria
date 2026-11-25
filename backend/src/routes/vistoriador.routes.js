const express = require('express');
const router = express.Router();

const vistoriadorController = require('../controllers/vistoriador.controller');

// GET: listar todos
router.get('/', vistoriadorController.listar);

// GET: buscar por id
router.get('/:id', vistoriadorController.buscarPorId);

// (D1) Para tirar alguém do papel de vistoriador, troque o cargo em PUT /funcionarios/:id.

module.exports = router;
