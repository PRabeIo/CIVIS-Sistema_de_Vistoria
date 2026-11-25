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
    const vistoriador = await vistoriadorService.buscarPorId(req.params.id);
    if (!vistoriador) return res.status(404).json({ error: 'Vistoriador não encontrado.' });
    return res.status(200).json(vistoriador);
  } catch (err) {
    console.error('Erro ao buscar vistoriador:', err);
    return res.status(500).json({ error: 'Erro ao buscar vistoriador.' });
  }
}


module.exports = {
  listar,
  buscarPorId,
};
