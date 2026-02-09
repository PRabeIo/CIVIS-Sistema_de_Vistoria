const express = require("express");
const router = express.Router();
const multer = require("multer");
const { gerarRelatorio } = require("../controllers/relatorioControler");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/gerar", upload.any(), gerarRelatorio);

module.exports = router;
