const clienteService = require('../services/cliente.service');

async function cadastroPublico(req, res) {
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
    console.error('Erro ao cadastrar cliente (público):', err);

    const status = err.statusCode || 500;
    return res.status(status).json({
      error: status < 500 ? err.message : 'Erro ao cadastrar cliente.',
    });
  }
}

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
      error: status < 500 ? err.message : 'Erro ao cadastrar cliente.',
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
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({ error: err.message });
    }
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

// PUT: Admin edita cliente (pode adicionar foto) - mantém
async function atualizarComImagem(req, res) {
  const id = Number(req.params.id);
  const { nome, cpf, email, telefone, senha } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  try {
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
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({ error: err.message });
    }
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

// PATCH - Atualizar meu perfil (somente dados)
async function atualizarMe(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const { nome, cpf, email, telefone } = req.body;

    const atualizado = await clienteService.atualizarMeuPerfil(idcliente, {
      nome, cpf, email, telefone
    });

    if (!atualizado) return res.status(404).json({ error: 'Cliente não encontrado.' });

    return res.status(200).json(atualizado);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('Erro ao atualizar meu perfil:', err);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
}

// PUT - Atualizar meu avatar (somente imagem)
async function atualizarMeAvatar(req, res) {
  try {
    const idcliente = req.usuario.sub;

    if (!req.file) {
      return res.status(400).json({ error: 'Envie um arquivo no campo "imagemdeperfil".' });
    }

    const filenameNovo = req.file.filename;

    const atualizado = await clienteService.atualizarMeuAvatar(idcliente, filenameNovo);

    if (!atualizado) return res.status(404).json({ error: 'Cliente não encontrado.' });

    return res.status(200).json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar meu avatar:', err);
    return res.status(500).json({ error: 'Erro ao atualizar avatar.' });
  }
}

// PUT - Atualizar minha senha (padrão empresa)
async function atualizarMinhaSenha(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const { senhaAtual, senhaNova } = req.body;

    if (!senhaAtual || !senhaNova) {
      return res.status(400).json({ error: 'Informe senhaAtual e senhaNova.' });
    }

    const atualizado = await clienteService.atualizarMinhaSenha(idcliente, senhaAtual, senhaNova);

    if (atualizado?.erro === 'CLIENTE_NAO_ENCONTRADO') {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    if (atualizado?.erro === 'SENHA_ATUAL_INCORRETA') {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }

    if (atualizado?.erro === 'SENHA_FRACA') {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
    }

    return res.status(200).json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar minha senha:', err);
    return res.status(500).json({ error: 'Erro ao atualizar senha.' });
  }
}

module.exports = {
  cadastroPublico,
  criar,
  listar,
  buscarPorId,
  atualizar,
  deletar,
  atualizarComImagem,
  me,
  atualizarMe,
  atualizarMeAvatar,
  atualizarMinhaSenha,
};