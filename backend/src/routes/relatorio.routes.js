const express = require("express");
const router = express.Router();
const multer = require("multer");

const { gerarRelatorio } = require("../controllers/relatorio.controller");
const { apenasVistoriador } = require("../middlewares/role.middleware");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Apenas vistoriador pode gerar relatório
router.post("/gerar", apenasVistoriador, upload.any(), gerarRelatorio);

module.exports = router;
