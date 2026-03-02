const express = require('express');
const router = express.Router();

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const clienteController = require('../controllers/cliente.controller');
const auth = require('../middlewares/auth.middleware');

const { apenasAdmin, apenasCliente } = require('../middlewares/role.middleware');

// uploads/clientes
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'clientes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storageCliente = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cliente_${Date.now()}${ext}`);
  },
});

const uploadCliente = multer({ storage: storageCliente });


// Cadastro público (sem token)
router.post('/cadastro', clienteController.cadastroPublico);


 // ROTAS DO CLIENTE LOGADO (token)

router.get('/me', auth, apenasCliente, clienteController.me);

// PATCH = atualização parcial de dados (JSON)
router.patch('/me', auth, apenasCliente, clienteController.atualizarMe);

// Avatar (somente imagem)
router.put('/me/avatar', auth, apenasCliente, uploadCliente.single('imagemdeperfil'), clienteController.atualizarMeAvatar);

// Troca de senha 
router.put('/me/senha', auth, apenasCliente, clienteController.atualizarMinhaSenha);


/**
 * ROTAS ADMINISTRATIVAS
 */
router.post('/', auth,  apenasAdmin, clienteController.criar);
router.get('/', auth, apenasAdmin, clienteController.listar);
router.get('/:id', auth, apenasAdmin, clienteController.buscarPorId);
router.put('/:id', auth, apenasAdmin, clienteController.atualizar);
router.delete('/:id', auth, apenasAdmin, clienteController.deletar);

// admin atualiza cliente com imagem 
router.put('/:id/atualizar-com-imagem', auth, apenasAdmin, uploadCliente.single('imagemdeperfil'), clienteController.atualizarComImagem);

module.exports = router;