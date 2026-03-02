// backend/src/controllers/funcionario.controller.js
const funcionarioService = require("../services/funcionario.service");

async function listar(req, res) {
  try {
    const funcionarios = await funcionarioService.listarComCargo();
    return res.json(funcionarios);
  } catch (err) {
    console.error("Erro ao buscar funcionários:", err);
    return res.status(500).json({ error: "Erro ao buscar funcionários." });
  }
}

async function criar(req, res) {
  const { cpf, email, nome, senha, telefone, cargo } = req.body;

  if (!cpf || !email || !nome || !senha || !cargo) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes." });
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
    });

    return res.status(201).json(funcionario);
  } catch (err) {
    console.error("Erro ao cadastrar funcionário:", err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      error: status === 409 ? err.message : "Erro ao cadastrar funcionário.",
      detalhes: err.message,
    });
  }
}

// ATUALIZAR POR ID (fluxo admin)
async function atualizar(id, dados, imagemdeperfilFilenameOrNull = null) {
  const idNum = Number(id);

  // se vier upload e id inválido, remove upload novo
  if (Number.isNaN(idNum)) {
    if (imagemdeperfilFilenameOrNull) {
      safeUnlink(path.join(FUNCIONARIO_UPLOAD_DIR, imagemdeperfilFilenameOrNull));
    }
    return null;
  }

  const caminhoNovo = imagemdeperfilFilenameOrNull
    ? path.join(FUNCIONARIO_UPLOAD_DIR, imagemdeperfilFilenameOrNull)
    : null;

  try {
    const [existente] = await db`SELECT * FROM funcionario WHERE id = ${idNum}`;
    if (!existente) {
      // funcionário não existe -> remove upload novo
      safeUnlink(caminhoNovo);
      return null;
    }

    const filenameAntigo = existente.imagemdeperfil ? String(existente.imagemdeperfil) : null;

    const { cpf, email, nome, senha, telefone } = dados;
    const senhaFinal = senha ? await bcrypt.hash(senha, SALT_ROUNDS) : existente.senha;

    const imagemdeperfilFinal = imagemdeperfilFilenameOrNull ?? existente.imagemdeperfil;

    // 1) atualiza banco primeiro
    const [f] = await db`
      UPDATE funcionario
      SET
        cpf = ${cpf ?? existente.cpf},
        email = ${email ?? existente.email},
        nome = ${nome ?? existente.nome},
        senha = ${senhaFinal},
        telefone = ${telefone ?? existente.telefone},
        imagemdeperfil = ${imagemdeperfilFinal}
      WHERE id = ${idNum}
      RETURNING *
    `;

    // 2) remove antigo APÓS sucesso, somente se realmente trocou
    if (imagemdeperfilFilenameOrNull && filenameAntigo && filenameAntigo !== imagemdeperfilFilenameOrNull) {
      safeUnlink(path.join(FUNCIONARIO_UPLOAD_DIR, filenameAntigo));
    }

    return f;
  } catch (err) {
    // erro -> remove upload novo
    safeUnlink(caminhoNovo);
    throw err;
  }
}

async function deletar(req, res) {
  const { id } = req.params;
  const { confirmacao } = req.body;

  if (confirmacao?.trim().toUpperCase() !== "SIM") {
    return res.status(400).json({ error: 'Digite "SIM" para confirmar a exclusão.' });
  }

  try {
    const ok = await funcionarioService.deletar(id);
    if (!ok) return res.status(404).json({ error: "Funcionário não encontrado." });

    return res.json({ message: "Funcionário deletado com sucesso." });
  } catch (err) {
    console.error("Erro ao excluir funcionário:", err);
    return res.status(500).json({ error: "Erro ao excluir funcionário." });
  }
}

async function buscarPorId(req, res) {
  const { id } = req.params;

  try {
    const f = await funcionarioService.buscarPorIdComCargo(id);
    if (!f) return res.status(404).json({ error: "Funcionário não encontrado." });

    return res.json(f);
  } catch (err) {
    console.error("Erro ao buscar funcionário por ID:", err);
    return res.status(500).json({ error: "Erro ao buscar funcionário." });
  }
}

async function perfil(req, res) {
  const { id } = req.params;

  try {
    const f = await funcionarioService.buscarPerfil(id);
    if (!f) return res.status(404).json({ error: "Funcionário não encontrado." });

    return res.json(f);
  } catch (err) {
    console.error("Erro ao buscar perfil:", err);
    return res.status(500).json({ error: "Erro ao buscar perfil." });
  }
}

async function atualizarCargo(req, res) {
  const { id } = req.params;
  const { cargo } = req.body;

  if (!cargo) return res.status(400).json({ error: "cargo é obrigatório." });

  try {
    const result = await funcionarioService.atualizarCargo(id, cargo);
    if (!result.ok) return res.status(result.status).json({ error: result.msg });

    return res.json({ message: "Cargo atualizado com sucesso." });
  } catch (err) {
    console.error("Erro ao atualizar cargo:", err);
    return res.status(500).json({ error: "Erro ao atualizar cargo." });
  }
}

/* ======= NOVOS CONTROLLERS: /me ======= */

async function me(req, res) {
  try {
    const id = req.usuario.sub;
    const perfil = await funcionarioService.buscarMeuPerfil(id);

    if (!perfil) return res.status(404).json({ error: "Funcionário não encontrado." });

    return res.status(200).json(perfil);
  } catch (err) {
    console.error("Erro ao buscar meu perfil (funcionário):", err);
    return res.status(500).json({ error: "Erro ao buscar perfil." });
  }
}

async function atualizarMe(req, res) {
  try {
    const id = req.usuario.sub;
    const { nome, cpf, email, telefone } = req.body;

    const atualizado = await funcionarioService.atualizarMeuPerfil(id, {
      nome,
      cpf,
      email,
      telefone,
    });

    if (!atualizado) return res.status(404).json({ error: "Funcionário não encontrado." });

    return res.status(200).json(atualizado);
  } catch (err) {
    console.error("Erro ao atualizar meu perfil (funcionário):", err);
    return res.status(500).json({ error: "Erro ao atualizar perfil." });
  }
}

async function atualizarMeuAvatar(req, res) {
  try {
    const id = req.usuario.sub;
    const filenameNovo = req.file ? req.file.filename : null;

    const atualizado = await funcionarioService.atualizarMeuAvatar(id, filenameNovo);
    if (!atualizado) return res.status(404).json({ error: "Funcionário não encontrado." });

    return res.status(200).json(atualizado);
  } catch (err) {
    console.error("Erro ao atualizar avatar (funcionário):", err);
    return res.status(500).json({ error: "Erro ao atualizar avatar." });
  }
}

async function atualizarMinhaSenha(req, res) {
  try {
    const id = req.usuario.sub;
    const { senhaAtual, senhaNova } = req.body;

    if (!senhaAtual || !senhaNova) {
      return res.status(400).json({ error: "senhaAtual e senhaNova são obrigatórias." });
    }

    const result = await funcionarioService.alterarMinhaSenha(id, senhaAtual, senhaNova);
    if (!result.ok) return res.status(result.status).json({ error: result.msg });

    return res.status(200).json({ message: "Senha alterada com sucesso." });
  } catch (err) {
    console.error("Erro ao alterar senha (funcionário):", err);
    return res.status(500).json({ error: "Erro ao alterar senha." });
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
  me,
  atualizarMe,
  atualizarMeuAvatar,
  atualizarMinhaSenha,
};