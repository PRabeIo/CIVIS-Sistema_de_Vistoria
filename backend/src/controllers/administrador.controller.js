const administradorService = require('../services/administrador.service');

// GET /
async function listarAdministradores(req, res) {
  try {
    const administradores = await administradorService.listar();
    return res.status(200).json(administradores);
  } catch (err) {
    console.error('Erro ao listar administradores:', err);
    return res.status(500).json({ error: 'Erro ao listar administradores.' });
  }
}

// DELETE /:idadministrador
async function deletarAdministrador(req, res) {
  const { idadministrador } = req.params;

  try {
    const ok = await administradorService.deletar(idadministrador);

    if (!ok) {
      return res.status(404).json({ error: 'Administrador não encontrado.' });
    }

    return res.json({ message: 'Administrador e funcionário removidos com sucesso.' });
  } catch (err) {
    console.error('Erro ao deletar administrador:', err.message);
    return res.status(500).json({ error: 'Erro ao deletar administrador.' });
  }
}

module.exports = {
  listarAdministradores,
  deletarAdministrador,
};
