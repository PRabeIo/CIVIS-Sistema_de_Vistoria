const db = require('../config/db');
const bcrypt = require('bcrypt');
const path = require("path");
const { safeUnlink } = require("../utils/file.util");
const CLIENTE_UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "clientes");
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

  // valida senha (obrigatória + mínimo)
  if (!senha || String(senha).length < 8) {
    const err = new Error('A senha deve ter pelo menos 8 caracteres.');
    err.statusCode = 400;
    throw err;
  }

  const telefoneSeguro = telefone || '';
  const senhaHash = await bcrypt.hash(String(senha), SALT_ROUNDS);

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
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;

  const caminhoNovo = novoArquivoFilenameOrNull
    ? path.join(CLIENTE_UPLOAD_DIR, novoArquivoFilenameOrNull)
    : null;

  try {
    const [clienteExistente] = await db`
      SELECT * FROM cliente WHERE idcliente = ${idNum}
    `;
    if (!clienteExistente) {
      // se subiu arquivo mas cliente não existe, remove o novo
      safeUnlink(caminhoNovo);
      return null;
    }

    const filenameAntigo = clienteExistente.imagemdeperfil
      ? String(clienteExistente.imagemdeperfil)
      : null;

    const imagemdeperfilFinal =
      novoArquivoFilenameOrNull ?? clienteExistente.imagemdeperfil;

    const { nome, cpf, email, telefone, senha } = dados;

    const senhaFinal = senha
      ? await bcrypt.hash(senha, SALT_ROUNDS)
      : clienteExistente.senha;

    // 1) atualiza banco primeiro
    const [result] = await db`
      UPDATE cliente SET
        nome = ${nome || clienteExistente.nome},
        cpf = ${cpf || clienteExistente.cpf},
        email = ${email || clienteExistente.email},
        telefone = ${telefone || clienteExistente.telefone},
        senha = ${senhaFinal},
        imagemdeperfil = ${imagemdeperfilFinal}
      WHERE idcliente = ${idNum}
      RETURNING *
    `;

    // 2) remove arquivo antigo APÓS update bem sucedido
    if (novoArquivoFilenameOrNull && filenameAntigo && filenameAntigo !== novoArquivoFilenameOrNull) {
      const caminhoAntigo = path.join(CLIENTE_UPLOAD_DIR, filenameAntigo);
      safeUnlink(caminhoAntigo);
    }

    return result;
  } catch (err) {
    // se deu erro, remove o arquivo novo (se houve upload)
    safeUnlink(caminhoNovo);
    throw err;
  }
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

// PATCH /me - atualizar dados do perfil (sem senha, sem imagem)
async function atualizarMeuPerfil(idcliente, { nome, cpf, email, telefone }) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) return null;

  const [existente] = await db`SELECT * FROM cliente WHERE idcliente = ${id}`;
  if (!existente) return null;

  const [atualizado] = await db`
    UPDATE cliente SET
      nome = ${nome ?? existente.nome},
      cpf = ${cpf ?? existente.cpf},
      email = ${email ?? existente.email},
      telefone = ${telefone ?? existente.telefone}
    WHERE idcliente = ${id}
    RETURNING idcliente, nome, cpf, email, telefone, imagemdeperfil
  `;

  return atualizado;
}

// PUT /me/avatar - atualizar somente a imagem
async function atualizarMeuAvatar(idcliente, filenameNovo) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) return null;

  // arquivo novo (para remover se der erro)
  const caminhoNovo = filenameNovo ? path.join(CLIENTE_UPLOAD_DIR, filenameNovo) : null;

  try {
    const [existente] = await db`SELECT * FROM cliente WHERE idcliente = ${id}`;
    if (!existente) {
      // cliente não existe -> remove o arquivo novo pra não ficar lixo
      safeUnlink(caminhoNovo);
      return null;
    }

    const filenameAntigo = existente.imagemdeperfil
      ? String(existente.imagemdeperfil)
      : null;

    // 1) atualiza o banco primeiro
    const [atualizado] = await db`
      UPDATE cliente SET
        imagemdeperfil = ${filenameNovo}
      WHERE idcliente = ${id}
      RETURNING idcliente, nome, cpf, email, telefone, imagemdeperfil
    `;

    // 2) só depois remove o antigo (evita perder se o update falhar)
    if (filenameAntigo && filenameAntigo !== filenameNovo) {
      const caminhoAntigo = path.join(CLIENTE_UPLOAD_DIR, filenameAntigo);
      safeUnlink(caminhoAntigo);
    }

    return atualizado;
  } catch (err) {
    // se qualquer erro acontecer, remove o arquivo novo pra não deixar lixo
    safeUnlink(caminhoNovo);
    throw err;
  }
}

// PUT /me/senha - trocar senha exigindo senha atual
async function atualizarMinhaSenha(idcliente, senhaAtual, senhaNova) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) return { erro: 'CLIENTE_NAO_ENCONTRADO' };

  const [existente] = await db`SELECT * FROM cliente WHERE idcliente = ${id}`;
  if (!existente) return { erro: 'CLIENTE_NAO_ENCONTRADO' };

  if (!senhaNova || String(senhaNova).length < 8) {
    return { erro: 'SENHA_FRACA' };
  }

  const ok = await bcrypt.compare(String(senhaAtual), existente.senha);
  if (!ok) return { erro: 'SENHA_ATUAL_INCORRETA' };

  const senhaHash = await bcrypt.hash(String(senhaNova), SALT_ROUNDS);

  await db`
    UPDATE cliente SET senha = ${senhaHash}
    WHERE idcliente = ${id}
  `;

  return { ok: true };
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
  atualizarMeuAvatar,
  atualizarMinhaSenha,
};