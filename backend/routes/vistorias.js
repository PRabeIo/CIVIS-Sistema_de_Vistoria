const express = require("express");
const router = express.Router();
const { criarVistoria, agendarVistoriaPorCliente } = require("../controllers/vistoriaController");

// Vistoria agendada por administrador
router.post("/", criarVistoria);

// Vistoria solicitada por cliente (rota PUT)
router.put("/agendar/:idimovel", agendarVistoriaPorCliente);

module.exports = router;
