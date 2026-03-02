const empreendimentoService = require('../services/empreendimento.service');

async function criar(req, res) {
  const { nome, construtora, estado, cidade, cep, rua } = req.body;

  const arquivoAnexo = req.file ? req.file.filename : null;

  try {
    const empreendimento = await empreendimentoService.criar({
      nome,
      construtora,
      estado,
      cidade,
      cep,
      rua,
      anexos: arquivoAnexo,
    });

    return res.status(201).json(empreendimento);
  } catch (err) {
    console.error('❌ Erro ao criar empreendimento:', err);
    return res.status(500).json({ error: 'Erro ao criar empreendimento.', detalhes: err.message });
  }
}

async function listar(req, res) {
  try {
    const empreendimentos = await empreendimentoService.listar();
    return res.status(200).json(empreendimentos);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar empreendimentos.', detalhes: err.message });
  }
}

async function buscarPorId(req, res) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  try {
    const empreendimento = await empreendimentoService.buscarPorId(id);

    if (!empreendimento) {
      return res.status(404).json({ error: 'Empreendimento não encontrado.' });
    }

    return res.status(200).json(empreendimento);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar empreendimento.', detalhes: err.message });
  }
}

async function listarImoveis(req, res) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  try {
    const imoveis = await empreendimentoService.listarImoveisDoEmpreendimento(id);
    return res.status(200).json(imoveis);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar imóveis do empreendimento.', detalhes: err.message });
  }
}

async function atualizar(req, res) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  const { nome, construtora, estado, cidade, cep, rua } = req.body;
  const arquivoAnexo = req.file ? req.file.filename : null;

  try {
    const ok = await empreendimentoService.atualizar(id, {
      nome,
      construtora,
      estado,
      cidade,
      cep,
      rua,
      anexos: arquivoAnexo,
    });

    if (!ok) {
      return res.status(404).json({ error: 'Empreendimento não encontrado.' });
    }

    return res.status(200).json({ message: 'Empreendimento atualizado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar empreendimento.', detalhes: err.message });
  }
}

async function deletar(req, res) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  try {
    const ok = await empreendimentoService.deletar(id);

    if (!ok) {
      return res.status(404).json({ error: 'Empreendimento não encontrado para exclusão.' });
    }

    return res.status(200).json({ message: 'Empreendimento excluído com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao excluir empreendimento.', detalhes: err.message });
  }
}

module.exports = {
  criar,
  listar,
  buscarPorId,
  listarImoveis,
  atualizar,
  deletar,
};
