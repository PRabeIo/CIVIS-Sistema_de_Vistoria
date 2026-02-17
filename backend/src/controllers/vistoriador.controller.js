const vistoriadorService = require('../services/vistoriador.service');

async function listar(req, res) {
  try {
    const vistoriadores = await vistoriadorService.listar();
    return res.status(200).json(vistoriadores);
  } catch (err) {
    console.error('Erro ao listar vistoriadores:', err);
    return res.status(500).json({ error: 'Erro ao listar vistoriadores.' });
  }
}

async function buscarPorId(req, res) {
  try {
    const { id } = req.params;

    const vistoria = await vistoriaService.buscarPorIdComAcesso(id, req.usuario);

    if (!vistoria) {
      // você pode escolher 404 para “não vazar existência”
      return res.status(404).json({ error: 'Vistoria não encontrada.' });
    }

    return res.status(200).json(vistoria);
  } catch (err) {
    console.error('Erro ao buscar vistoria:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar vistoria.' });
  }
}


async function deletar(req, res) {
  const { id } = req.params;

  try {
    const ok = await vistoriadorService.removerCargo(id);
    if (!ok) {
      return res.status(404).json({ error: 'Vistoriador não encontrado.' });
    }

    // importante: aqui você remove só o cargo, não o funcionário
    return res.status(200).json({ message: 'Cargo de vistoriador removido com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir vistoriador:', err);
    return res.status(500).json({ error: 'Erro ao excluir vistoriador.' });
  }
}

module.exports = {
  listar,
  buscarPorId,
  deletar,
};
