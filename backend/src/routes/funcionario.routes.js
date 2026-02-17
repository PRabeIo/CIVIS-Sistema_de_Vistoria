const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const funcionarioController = require('../controllers/funcionario.controller');

// uploads/funcionarios
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'funcionarios');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// lista todos
router.get('/', funcionarioController.listar);

// ✅ cria (com ou sem imagem)
// (agora existe só UMA rota POST "/", sem duplicação)
router.post('/', upload.single('imagemdeperfil'), funcionarioController.criar);

// rotas específicas primeiro (pra não bater em "/:id")
router.get('/perfil/:id', funcionarioController.perfil);

// atualizar perfil
router.put('/:id', upload.single('imagemdeperfil'), funcionarioController.atualizar);

// deletar
router.delete('/:id', funcionarioController.deletar);

// buscar por id (por último)
router.get('/:id', funcionarioController.buscarPorId);

module.exports = router;
