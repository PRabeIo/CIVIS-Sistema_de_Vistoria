const express = require('express');
const router = express.Router();

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const clienteController = require('../controllers/cliente.controller');
const clienteService = require('../services/cliente.service');

const { apenasAdmin, apenasCliente } = require('../middlewares/role.middleware');

// multer clientes
const storageCliente = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'clientes');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cliente_${Date.now()}${ext}`);
  },
});
const uploadCliente = multer({ storage: storageCliente });

/**
 * ✅ ROTAS DO CLIENTE LOGADO (token)
 */
router.get('/me', apenasCliente, clienteController.me);

router.put('/me', apenasCliente, clienteController.atualizarMe);

router.put('/me/atualizar-com-imagem',apenasCliente,uploadCliente.single('imagemdeperfil'),
  async (req, res, next) => {
    try {
      // se mandou nova imagem, remover a antiga
      if (req.file) {
        const clienteExistente = await clienteService.buscarClientePorId(req.usuario.sub);

        if (!clienteExistente) {
          // remove a nova imagem pra não deixar lixo
          const caminhoNovo = path.join(__dirname, '..', '..', 'uploads', 'clientes', req.file.filename);
          if (fs.existsSync(caminhoNovo)) fs.unlinkSync(caminhoNovo);
          return res.status(404).json({ error: 'Cliente não encontrado.' });
        }

        if (clienteExistente.imagemdeperfil) {
          const caminhoAntigo = path.join(__dirname, '..', '..', 'uploads', 'clientes', clienteExistente.imagemdeperfil);
          if (fs.existsSync(caminhoAntigo)) fs.unlinkSync(caminhoAntigo);
        }
      }

      return clienteController.atualizarMeComImagem(req, res);
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * (Opcional) ROTAS ADMINISTRATIVAS
 * Se você não quiser admin mexendo em cliente, pode remover tudo abaixo.
 */
router.post('/', apenasAdmin, clienteController.criar);
router.get('/', apenasAdmin, clienteController.listar);
router.get('/:id', apenasAdmin, clienteController.buscarPorId);
router.put('/:id', apenasAdmin, clienteController.atualizar);
router.delete('/:id', apenasAdmin, clienteController.deletar);

// admin atualiza cliente com imagem (opcional)
router.put(
  '/:id/atualizar-com-imagem',
  apenasAdmin,
  uploadCliente.single('imagemdeperfil'),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

      if (req.file) {
        const clienteExistente = await clienteService.buscarClientePorId(id);
        if (!clienteExistente) {
          const caminhoNovo = path.join(__dirname, '..', '..', 'uploads', 'clientes', req.file.filename);
          if (fs.existsSync(caminhoNovo)) fs.unlinkSync(caminhoNovo);
          return res.status(404).json({ error: 'Cliente não encontrado.' });
        }

        if (clienteExistente.imagemdeperfil) {
          const caminhoAntigo = path.join(__dirname, '..', '..', 'uploads', 'clientes', clienteExistente.imagemdeperfil);
          if (fs.existsSync(caminhoAntigo)) fs.unlinkSync(caminhoAntigo);
        }
      }

      return clienteController.atualizarComImagem(req, res);
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
