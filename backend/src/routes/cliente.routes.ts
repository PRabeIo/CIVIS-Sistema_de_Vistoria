import { Router } from 'express';
import * as clienteController from '../controllers/cliente.controller';
import auth from '../middlewares/auth.middleware';
import { apenasAdmin, apenasCliente } from '../middlewares/role.middleware';
import { limiteCadastro } from '../middlewares/seguranca.middleware';
import { uploadImagemEmDisco } from '../utils/upload';

const router = Router();
const avatar = uploadImagemEmDisco('clientes', 'imagemdeperfil', 5);

// Cadastro público (sem token)
router.post('/cadastro', limiteCadastro, clienteController.cadastroPublico);

// Cliente logado
router.get('/me', auth, apenasCliente, clienteController.me);
router.patch('/me', auth, apenasCliente, clienteController.atualizarMe);
router.put('/me/avatar', auth, apenasCliente, ...avatar, clienteController.atualizarMeAvatar);
router.put('/me/senha', auth, apenasCliente, clienteController.atualizarMinhaSenha);
router.get('/me/dados', auth, apenasCliente, clienteController.exportarMeusDados); // S11
router.delete('/me', auth, apenasCliente, clienteController.excluirMinhaConta); // S11

// Administração
router.post('/', auth, apenasAdmin, clienteController.criar);
router.get('/', auth, apenasAdmin, clienteController.listar);
router.get('/:id', auth, apenasAdmin, clienteController.buscarPorId);
router.put('/:id', auth, apenasAdmin, clienteController.atualizar);
router.delete('/:id', auth, apenasAdmin, clienteController.deletar);
router.put('/:id/atualizar-com-imagem', auth, apenasAdmin, ...avatar, clienteController.atualizarComImagem);

export = router;
