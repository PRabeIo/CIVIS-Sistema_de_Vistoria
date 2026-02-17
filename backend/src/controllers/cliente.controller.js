const clienteService = require('../services/cliente.service');

async function criar(req, res) {
  const { nome, cpf, email, senha, telefone } = req.body;

  if (!nome || !cpf || !email || !senha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    const novoCliente = await clienteService.criarCliente({
      nome,
      cpf,
      email,
      senha,
      telefone,
    });

    return res.status(201).json(novoCliente);
  } catch (err) {
    console.error('Erro ao cadastrar cliente:', err);

    const status = err.statusCode || 500;
    return res.status(status).json({
      error: status === 409 ? err.message : 'Erro ao cadastrar cliente.',
      detalhes: err.message,
    });
  }
}

async function listar(req, res) {
  try {
    const clientes = await clienteService.listarClientes();
    return res.status(200).json(clientes);
  } catch (err) {
    console.error('Erro ao buscar clientes:', err);
    return res.status(500).json({ error: 'Erro ao buscar clientes.', detalhes: err.message });
  }
}

async function buscarPorId(req, res) {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  try {
    const cliente = await clienteService.buscarClientePorId(id);

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    return res.status(200).json(cliente);
  } catch (err) {
    console.error('Erro ao buscar cliente:', err);
    return res.status(500).json({ error: 'Erro ao buscar cliente.', detalhes: err.message });
  }
}

async function atualizar(req, res) {
  const id = Number(req.params.id);
  const { nome, cpf, email, telefone } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  try {
    const clienteAtualizado = await clienteService.atualizarCliente(id, {
      nome,
      cpf,
      email,
      telefone,
    });

    if (!clienteAtualizado) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    return res.status(200).json(clienteAtualizado);
  } catch (err) {
    console.error('Erro ao atualizar cliente:', err);
    return res.status(500).json({ error: 'Erro ao atualizar cliente.', detalhes: err.message });
  }
}

async function deletar(req, res) {
  const id = Number(req.params.id);
  const { confirmacao } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  if (confirmacao?.trim().toUpperCase() !== 'SIM') {
    return res.status(400).json({
      error: 'Confirmação de exclusão ausente ou incorreta. Digite "SIM" para confirmar.',
    });
  }

  try {
    const ok = await clienteService.deletarCliente(id);

    if (!ok) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    return res.status(200).json({ message: 'Cliente excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir cliente:', err);
    return res.status(500).json({ error: 'Erro ao excluir cliente.', detalhes: err.message });
  }
}

// PUT: Cliente edita seus dados (pode adicionar foto)
async function atualizarComImagem(req, res) {
  const id = Number(req.params.id);
  const { nome, cpf, email, telefone, senha } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  try {
    // Se tiver arquivo, o multer já salvou e colocou em req.file
    const filenameNovo = req.file ? req.file.filename : null;

    const clienteAtualizado = await clienteService.atualizarClienteComImagem(
      id,
      { nome, cpf, email, telefone, senha },
      filenameNovo
    );

    if (!clienteAtualizado) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    return res.status(200).json(clienteAtualizado);
  } catch (err) {
    console.error('Erro ao atualizar cliente com imagem:', err);
    return res.status(500).json({ error: 'Erro ao atualizar cliente.', detalhes: err.message });
  }
}

// GET - Buscar meu perfil
async function me(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const perfil = await clienteService.buscarMeuPerfil(idcliente);

    if (!perfil) return res.status(404).json({ error: 'Cliente não encontrado.' });

    return res.status(200).json(perfil);
  } catch (err) {
    console.error('Erro ao buscar meu perfil:', err);
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
}

// PUT - Atualizar meu perfil
async function atualizarMe(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const { nome, cpf, email, telefone, senha } = req.body;

    const atualizado = await clienteService.atualizarMeuPerfil(idcliente, {
      nome, cpf, email, telefone, senha
    });

    if (!atualizado) return res.status(404).json({ error: 'Cliente não encontrado.' });

    return res.status(200).json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar meu perfil:', err);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
}

async function atualizarMeComImagem(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const { nome, cpf, email, telefone, senha } = req.body;

    const filenameNovo = req.file ? req.file.filename : null;

    const atualizado = await clienteService.atualizarMeuPerfilComImagem(
      idcliente,
      { nome, cpf, email, telefone, senha },
      filenameNovo
    );

    if (!atualizado) return res.status(404).json({ error: 'Cliente não encontrado.' });

    return res.status(200).json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar meu perfil com imagem:', err);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
}

module.exports = {
  criar,
  listar,
  buscarPorId,
  atualizar,
  deletar,
  atualizarComImagem,
  me,
  atualizarMe,
  atualizarMeComImagem,
};
