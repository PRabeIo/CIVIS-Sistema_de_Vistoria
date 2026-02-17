const express = require('express');
const router = express.Router();

const imovelController = require('../controllers/imovel.controller');
const { apenasAdmin, apenasCliente } = require('../middlewares/role.middleware');



// ADMIN
router.post('/', apenasAdmin, imovelController.criar); // POST - cria imóvel (+ vistoria inicial)
router.get('/', apenasAdmin, imovelController.listarPorEmpreendimento); // GET - lista imóveis por empreendimento (ÚTIL) -> /api/imoveis?empreendimentoid=123
router.get('/orfaos', apenasAdmin, imovelController.listarOrfaos); // GET - debug/consistência: imóveis órfãos sem vistoria -> /api/imoveis/orfaos?empreendimentoid=123
router.get('/todos', apenasAdmin, imovelController.listarTodos); // GET - todos com dados adicionais
router.put('/:idimovel', apenasAdmin, imovelController.atualizar); // PUT - atualizar imóvel (retorna o imóvel atualizado agora)
router.get('/cliente/:idcliente', apenasAdmin, imovelController.listarVistoriasDoCliente); // GET - vistorias dos imóveis de um cliente
router.get('/cliente/:idcliente/disponiveis',apenasAdmin, imovelController.listarDisponiveis); // GET - imóveis disponíveis para agendamento (status aguardando)


// CLIENTE
router.get('/me', apenasCliente, imovelController.listarMeusImoveis);  // GET - Imóveis do Cliente
router.get('/me/:idimovel', apenasCliente, imovelController.buscarMeuImovelPorId);  // GET - Imóvel X do Cliente

module.exports = router;
