const express = require('express');
const router = express.Router();

const vistoriaController = require('../controllers/vistoria.controller');
const { apenasAdmin, apenasVistoriador, apenasCliente } = require('../middlewares/role.middleware');

/**
 * CLIENTE
 */
router.get('/minhas', apenasCliente, vistoriaController.minhas);
router.get('/minhas/pendentes-agendamento', apenasCliente, vistoriaController.pendentesAgendamentoMe);
router.get('/minhas/pendentes-validacao', apenasCliente, vistoriaController.pendentesValidacaoMe);
router.get('/minhas/aguardando-validacao', apenasCliente, vistoriaController.aguardandoValidacaoMe);

router.put('/:idvistoria/agendar', apenasCliente, vistoriaController.agendar);
router.put('/:idvistoria/rejeitar', apenasCliente, vistoriaController.rejeitar);
router.put('/:idvistoria/validar', apenasCliente, vistoriaController.validar);

/**
 * VISTORIADOR
 */
router.get('/disponiveis', apenasVistoriador, vistoriaController.disponiveisVistoriador);
router.get('/minhas-vistoriador', apenasVistoriador, vistoriaController.minhasVistoriador);
router.put('/:idvistoria/iniciar', apenasVistoriador, vistoriaController.iniciar);
router.put('/:idvistoria/finalizar', apenasVistoriador, vistoriaController.finalizar);

/**
 * ADMIN
 */
router.get('/', apenasAdmin, vistoriaController.listar);
router.put('/:idvistoria/cancelar', apenasAdmin, vistoriaController.cancelar);
router.put('/:idvistoria/pedir-revisao', apenasAdmin, vistoriaController.pedirRevisao);
router.put('/:idvistoria/encerrar', apenasAdmin, vistoriaController.encerrar);
router.put('/:idvistoria', apenasAdmin, vistoriaController.atualizar);
router.delete('/:idvistoria', apenasAdmin, vistoriaController.deletar);

/**
 * TODOS OS PAPÉIS (a máquina de estados confere quem pode)
 */
// F3: cliente dono, vistoriador da vistoria ou admin, antes do início
router.put('/:idvistoria/reagendar', vistoriaController.reagendar);

/**
 * POR ID
 */
// S2: relatório privado (cliente dono, vistoriador da vistoria ou admin)
router.get('/:idvistoria/relatorio', vistoriaController.relatorio);
// D5: histórico de status (mesma regra de acesso do detalhe)
router.get('/:idvistoria/eventos', vistoriaController.eventos);
router.get('/:idvistoria', vistoriaController.buscarPorId);



module.exports = router;
