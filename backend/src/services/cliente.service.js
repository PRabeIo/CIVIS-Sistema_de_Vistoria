const db = require('../config/db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

async function criarCliente({ nome, cpf, email, senha, telefone }) {
  const [usuarioExistente] = await db`
    SELECT 1 FROM cliente WHERE email = ${email} LIMIT 1
  `;
  if (usuarioExistente) {
    const err = new Error('Email já cadastrado.');
    err.statusCode = 409;
    throw err;
  }

  if (!senha) {
    const err = new Error('Senha é obrigatória.');
    err.statusCode = 400;
    throw err;
  }

  const telefoneSeguro = telefone || '';

  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

  const [novoCliente] = await db`
    INSERT INTO cliente (nome, cpf, email, senha, telefone)
    VALUES (${nome}, ${cpf}, ${email}, ${senhaHash}, ${telefoneSeguro})
    RETURNING *
  `;

  return novoCliente;
}

async function listarClientes() {
  return db`SELECT * FROM cliente ORDER BY idcliente DESC`;
}

async function buscarClientePorId(id) {
  const [cliente] = await db`SELECT * FROM cliente WHERE idcliente = ${id}`;
  return cliente;
}

async function deletarCliente(id) {
  const [cliente] = await db`SELECT 1 FROM cliente WHERE idcliente = ${id}`;
  if (!cliente) return false;

  await db`DELETE FROM cliente WHERE idcliente = ${id}`;
  return true;
}

async function atualizarCliente(id, { nome, cpf, email, telefone }) {
  const result = await db`
    UPDATE cliente
    SET nome = ${nome}, cpf = ${cpf}, email = ${email}, telefone = ${telefone}
    WHERE idcliente = ${id}
    RETURNING *
  `;

  return result[0];
}

async function atualizarClienteComImagem(id, dados, novoArquivoFilenameOrNull) {
  const [clienteExistente] = await db`
    SELECT * FROM cliente WHERE idcliente = ${id}
  `;
  if (!clienteExistente) return null;

  const imagemdeperfilFinal =
    novoArquivoFilenameOrNull ?? clienteExistente.imagemdeperfil;

  const { nome, cpf, email, telefone, senha } = dados;

  // ✅ só re-hasheia se veio senha nova
  const senhaFinal = senha
    ? await bcrypt.hash(senha, SALT_ROUNDS)
    : clienteExistente.senha;

  const result = await db`
    UPDATE cliente SET
      nome = ${nome || clienteExistente.nome},
      cpf = ${cpf || clienteExistente.cpf},
      email = ${email || clienteExistente.email},
      telefone = ${telefone || clienteExistente.telefone},
      senha = ${senhaFinal},
      imagemdeperfil = ${imagemdeperfilFinal}
    WHERE idcliente = ${id}
    RETURNING *
  `;

  return result[0];
}


// Buscar meu perfil (cliente logado)
async function buscarMeuPerfil(idcliente) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) return null;

  const [c] = await db`
    SELECT idcliente, nome, cpf, email, telefone, imagemdeperfil
    FROM cliente
    WHERE idcliente = ${id}
  `;
  return c;
}

// Atualizar meu perfil (sem imagem)
async function atualizarMeuPerfil(idcliente, { nome, cpf, email, telefone, senha }) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) return null;

  const [existente] = await db`SELECT * FROM cliente WHERE idcliente = ${id}`;
  if (!existente) return null;

  const senhaFinal = senha
    ? await bcrypt.hash(senha, SALT_ROUNDS)
    : existente.senha;

  const [atualizado] = await db`
    UPDATE cliente SET
      nome = ${nome ?? existente.nome},
      cpf = ${cpf ?? existente.cpf},
      email = ${email ?? existente.email},
      telefone = ${telefone ?? existente.telefone},
      senha = ${senhaFinal}
    WHERE idcliente = ${id}
    RETURNING idcliente, nome, cpf, email, telefone, imagemdeperfil
  `;

  return atualizado;
}

// Atualizar meu perfil com imagem (e senha opcional)
async function atualizarMeuPerfilComImagem(idcliente, dados, novoArquivoFilenameOrNull) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) return null;

  const [existente] = await db`SELECT * FROM cliente WHERE idcliente = ${id}`;
  if (!existente) return null;

  const imagemdeperfilFinal = novoArquivoFilenameOrNull ?? existente.imagemdeperfil;

  const { nome, cpf, email, telefone, senha } = dados;

  const senhaFinal = senha
    ? await bcrypt.hash(senha, SALT_ROUNDS)
    : existente.senha;

  const [atualizado] = await db`
    UPDATE cliente SET
      nome = ${nome ?? existente.nome},
      cpf = ${cpf ?? existente.cpf},
      email = ${email ?? existente.email},
      telefone = ${telefone ?? existente.telefone},
      senha = ${senhaFinal},
      imagemdeperfil = ${imagemdeperfilFinal}
    WHERE idcliente = ${id}
    RETURNING idcliente, nome, cpf, email, telefone, imagemdeperfil
  `;

  return atualizado;
}

module.exports = {
  criarCliente,
  listarClientes,
  buscarClientePorId,
  deletarCliente,
  atualizarCliente,
  atualizarClienteComImagem,
  buscarMeuPerfil,
  atualizarMeuPerfil,
  atualizarMeuPerfilComImagem,
};
