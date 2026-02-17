const express = require('express');
const router = express.Router();

const vistoriaController = require('../controllers/vistoria.controller');
const { apenasAdmin, apenasVistoriador, apenasCliente } = require('../middlewares/role.middleware');
const auth = require('../middlewares/auth.middleware'); 
const { onlyNumericId } = require('../middlewares/numeric.middleware');

/**
 * CLIENTE
 */
router.get('/minhas', apenasCliente, vistoriaController.minhas);
router.get('/minhas/pendentes-agendamento', apenasCliente, vistoriaController.pendentesAgendamentoMe);
router.get('/minhas/pendentes-validacao', apenasCliente, vistoriaController.pendentesValidacaoMe);
router.get('/minhas/aguardando-validacao', apenasCliente, vistoriaController.aguardandoValidacaoMe);

router.put('/:idvistoria/agendar', apenasCliente, vistoriaController.agendar);
router.put('/:idvistoria/reagendar', apenasCliente, vistoriaController.reagendar);
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
router.put('/:idvistoria', apenasAdmin, vistoriaController.atualizar);
router.delete('/:idvistoria', apenasAdmin, vistoriaController.deletar);

/**
 * POR ID (deixe por último!)
 */
router.get("/:idvistoria", auth, onlyNumericId, vistoriaController.buscarPorId);

/**
 * =========================
 * LEGADO (opcional)
 * - pode remover depois que o front migrar
 * =========================
 */
/*
router.get('/pendentes/cliente/:idcliente', apenasCliente, vistoriaController.pendentesAgendamentoCliente);
router.get('/cliente/:idcliente/pendentes-validacao', apenasCliente, vistoriaController.pendentesValidacaoCliente);
router.get('/cliente/:idcliente/aguardando-validacao', apenasCliente, vistoriaController.aguardandoValidacaoCliente);
*/


module.exports = router;
