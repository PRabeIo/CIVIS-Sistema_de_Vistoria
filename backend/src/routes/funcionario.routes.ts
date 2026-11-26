// Montado em /funcionarios já com o auth.middleware (ver routes/index.js).
import { Router } from 'express';
import * as funcionarioController from '../controllers/funcionario.controller';
import { apenasAdmin, apenasFuncionario, apenasVistoriador } from '../middlewares/role.middleware';
import { IMAGENS_PDF, uploadImagemEmDisco, uploadImagemEmMemoria } from '../utils/upload';

const router = Router();
const avatar = uploadImagemEmDisco('funcionarios', 'imagemdeperfil', 5);
const assinatura = uploadImagemEmMemoria('assinatura', { maxMB: 1, tipos: IMAGENS_PDF });

// Funcionário logado
router.get('/me', apenasFuncionario, funcionarioController.me);
router.patch('/me', apenasFuncionario, funcionarioController.atualizarMe);
router.put('/me/avatar', apenasFuncionario, ...avatar, funcionarioController.atualizarMeuAvatar);
router.put('/me/senha', apenasFuncionario, funcionarioController.atualizarMinhaSenha);
router.get('/me/assinatura', apenasVistoriador, funcionarioController.minhaAssinatura);
router.put('/me/assinatura', apenasVistoriador, ...assinatura, funcionarioController.salvarMinhaAssinatura);
router.delete('/me/assinatura', apenasVistoriador, funcionarioController.removerMinhaAssinatura);

// Administração
router.get('/', apenasAdmin, funcionarioController.listar);
router.post('/', apenasAdmin, funcionarioController.criar);
router.get('/perfil/:id', apenasAdmin, funcionarioController.perfil);
router.get('/:id', apenasAdmin, funcionarioController.buscarPorId);
router.put('/:id', apenasAdmin, ...avatar, funcionarioController.atualizar);
router.delete('/:id', apenasAdmin, funcionarioController.deletar);

export = router;
