const imovelService = require('../services/imovel.service');

// POST - Cadastrar imóvel (e criar vistoria inicial)
async function criar(req, res) {
  try {
    const resultado = await imovelService.criarImovelComVistoria(req.body);
    return res.status(201).json(resultado);
  } catch (err) {
    console.error('Erro ao cadastrar imóvel:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Erro ao cadastrar imóvel.' });
  }
}

/**
 * (NOVO - ÚTIL) GET /imoveis?empreendimentoid=123
 * Lista todos os imóveis do empreendimento.
 */
async function listarPorEmpreendimento(req, res) {
  const { empreendimentoid } = req.query;
  if (!empreendimentoid) {
    return res.status(400).json({ error: 'Parâmetro empreendimentoid é obrigatório.' });
  }

  try {
    const imoveis = await imovelService.listarPorEmpreendimento(empreendimentoid);
    return res.status(200).json(imoveis);
  } catch (err) {
    console.error('Erro ao listar imóveis por empreendimento:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Erro ao buscar imóveis.' });
  }
}

/**
 * (NOVO - DEBUG) GET /imoveis/orfaos?empreendimentoid=123
 * Lista imóveis que por algum erro ficaram sem vistoria.
 */
async function listarOrfaos(req, res) {
  const { empreendimentoid } = req.query;
  if (!empreendimentoid) {
    return res.status(400).json({ error: 'Parâmetro empreendimentoid é obrigatório.' });
  }

  try {
    const imoveis = await imovelService.listarOrfaosSemVistoria(empreendimentoid);
    return res.status(200).json(imoveis);
  } catch (err) {
    console.error('Erro ao listar imóveis órfãos:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Erro ao buscar imóveis.' });
  }
}

// GET - Buscar todos os imóveis com dados adicionais
async function listarTodos(req, res) {
  try {
    const imoveis = await imovelService.listarTodosComDados();
    return res.status(200).json(imoveis);
  } catch (err) {
    console.error('Erro ao buscar imóveis:', err);
    return res.status(500).json({ error: 'Erro ao buscar imóveis.' });
  }
}

// GET - Buscar todas as vistorias dos imóveis de um cliente
async function listarVistoriasDoCliente(req, res) {
  const { idcliente } = req.params;

  try {
    const vistorias = await imovelService.listarVistoriasDosImoveisDoCliente(idcliente);
    return res.status(200).json(vistorias);
  } catch (err) {
    console.error('Erro ao buscar vistorias do cliente:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Erro ao buscar vistorias do cliente.' });
  }
}

// PUT - Atualizar imóvel (retorna o imóvel atualizado agora)
async function atualizar(req, res) {
  const { idimovel } = req.params;

  try {
    const atualizado = await imovelService.atualizarImovel(idimovel, req.body);

    if (!atualizado) {
      return res.status(404).json({ error: 'Imóvel não encontrado.' });
    }

    return res.status(200).json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar imóvel:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Erro ao atualizar imóvel.' });
  }
}

// GET - Imóveis disponíveis para agendamento
async function listarDisponiveis(req, res) {
  const { idcliente } = req.params;

  try {
    const imoveis = await imovelService.listarDisponiveisParaAgendamento(idcliente);
    return res.status(200).json(imoveis);
  } catch (err) {
    console.error('Erro ao buscar imóveis disponíveis:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Erro ao buscar imóveis disponíveis.' });
  }
}

async function listarMeusImoveis(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const imoveis = await imovelService.listarMeusImoveis(idcliente);
    return res.status(200).json(imoveis);
  } catch (err) {
    console.error('Erro ao listar meus imóveis:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao listar imóveis.' });
  }
}

async function buscarMeuImovelPorId(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const { idimovel } = req.params;

    const imovel = await imovelService.buscarMeuImovelPorId(idcliente, idimovel);

    if (!imovel) {
      return res.status(404).json({ error: 'Imóvel não encontrado (ou não pertence ao cliente).' });
    }

    return res.status(200).json(imovel);
  } catch (err) {
    console.error('Erro ao buscar meu imóvel:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar imóvel.' });
  }
}

module.exports = {
  criar,
  listarPorEmpreendimento,
  listarOrfaos,
  listarTodos,
  listarVistoriasDoCliente,
  atualizar,
  listarDisponiveis,
  listarMeusImoveis,
  buscarMeuImovelPorId
};
