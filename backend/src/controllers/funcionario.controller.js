const funcionarioService = require('../services/funcionario.service');

async function listar(req, res) {
  try {
    const funcionarios = await funcionarioService.listarComCargo();
    return res.json(funcionarios);
  } catch (err) {
    console.error('Erro ao buscar funcionários:', err);
    return res.status(500).json({ error: 'Erro ao buscar funcionários.' });
  }
}

async function criar(req, res) {
  const { cpf, email, nome, senha, telefone, cargo } = req.body;
  const imagemDePerfil = req.file ? req.file.filename : null;

  if (!cpf || !email || !nome || !senha || !cargo) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
  }

  if (!["Administrador", "Vistoriador"].includes(cargo)) {
    return res.status(400).json({ error: "Cargo inválido." });
  }

  try {
    const funcionario = await funcionarioService.criar({
      cpf,
      email,
      nome,
      senha,
      telefone,
      cargo,
      imagemdeperfil: imagemDePerfil,
    });

    return res.status(201).json(funcionario);
  } catch (err) {
    console.error('Erro ao cadastrar funcionário:', err);
    return res.status(500).json({ error: 'Erro ao cadastrar funcionário.' });
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const imagemDePerfil = req.file ? req.file.filename : null;

  try {
    const f = await funcionarioService.atualizar(id, req.body, imagemDePerfil);
    if (!f) return res.status(404).json({ error: 'Funcionário não encontrado.' });

    return res.json(f);
  } catch (err) {
    console.error('Erro ao atualizar funcionário:', err);
    return res.status(500).json({ error: 'Erro ao atualizar funcionário.' });
  }
}

async function deletar(req, res) {
  const { id } = req.params;
  const { confirmacao } = req.body;

  if (confirmacao?.trim().toUpperCase() !== 'SIM') {
    return res.status(400).json({ error: 'Digite "SIM" para confirmar a exclusão.' });
  }

  try {
    const ok = await funcionarioService.deletar(id);
    if (!ok) return res.status(404).json({ error: 'Funcionário não encontrado.' });

    return res.json({ message: 'Funcionário deletado com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir funcionário:', err);
    return res.status(500).json({ error: 'Erro ao excluir funcionário.' });
  }
}

async function buscarPorId(req, res) {
  const { id } = req.params;

  try {
    const f = await funcionarioService.buscarPorIdComCargo(id);
    if (!f) return res.status(404).json({ error: 'Funcionário não encontrado.' });

    return res.json(f);
  } catch (err) {
    console.error('Erro ao buscar funcionário por ID:', err);
    return res.status(500).json({ error: 'Erro ao buscar funcionário.' });
  }
}

async function perfil(req, res) {
  const { id } = req.params;

  try {
    const f = await funcionarioService.buscarPerfil(id);
    if (!f) return res.status(404).json({ error: 'Funcionário não encontrado.' });

    return res.json(f);
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
}


async function atualizarCargo(req, res) {
  const { id } = req.params;
  const { cargo } = req.body;

  if (!cargo) return res.status(400).json({ error: 'cargo é obrigatório.' });

  try {
    const result = await funcionarioService.atualizarCargo(id, cargo);
    if (!result.ok) return res.status(result.status).json({ error: result.msg });

    return res.json({ message: 'Cargo atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar cargo:', err);
    return res.status(500).json({ error: 'Erro ao atualizar cargo.' });
  }
}


module.exports = {
  listar,
  criar,
  atualizar,
  deletar,
  buscarPorId,
  perfil,
  atualizarCargo,
};
