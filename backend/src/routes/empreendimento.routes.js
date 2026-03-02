const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const empreendimentoController = require('../controllers/empreendimento.controller');

// Garante que a pasta de uploads exista (mesmo comportamento do original)
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'empreendimentos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

/* ========== CRUD ========== */

// POST: Criar novo empreendimento (com anexo)
router.post('/', upload.single('anexos'), empreendimentoController.criar);

// GET: Listar todos
router.get('/', empreendimentoController.listar);

// GET: Buscar por ID
router.get('/:id', empreendimentoController.buscarPorId);

// GET: Imóveis de um empreendimento específico
router.get('/:id/imoveis', empreendimentoController.listarImoveis);

// PUT: Atualizar (com anexo opcional)
router.put('/:id', upload.single('anexos'), empreendimentoController.atualizar);

// DELETE: Excluir
router.delete('/:id', empreendimentoController.deletar);

module.exports = router;
