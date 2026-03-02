// backend/src/services/funcionario.service.js
const db = require("../config/db");
const bcrypt = require("bcrypt");
const path = require("path");
const { safeUnlink } = require("../utils/file.util");
const FUNCIONARIO_UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "funcionarios");
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

async function listarComCargo() {
  return db`
    SELECT 
      f.*, 
      CASE 
        WHEN v.idvistoriador IS NOT NULL THEN 'Vistoriador'
        WHEN a.idadministrador IS NOT NULL THEN 'Administrador'
        ELSE 'Desconhecido'
      END AS cargo
    FROM funcionario f
    LEFT JOIN vistoriador v ON f.id = v.idvistoriador
    LEFT JOIN administrador a ON f.id = a.idadministrador
    ORDER BY f.id DESC
  `;
}

async function buscarPorIdComCargo(id) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;

  const [f] = await db`
    SELECT 
      f.*, 
      CASE 
        WHEN v.idvistoriador IS NOT NULL THEN 'Vistoriador'
        WHEN a.idadministrador IS NOT NULL THEN 'Administrador'
        ELSE 'Desconhecido'
      END AS cargo
    FROM funcionario f
    LEFT JOIN vistoriador v ON f.id = v.idvistoriador
    LEFT JOIN administrador a ON f.id = a.idadministrador
    WHERE f.id = ${idNum}
  `;
  return f;
}

// PERFIL POR ID (para ADM ver, se quiser manter)
async function buscarPerfil(id) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;

  const [f] = await db`
    SELECT 
      f.id, f.nome, f.cpf, f.email, f.telefone, f.imagemdeperfil,
      CASE 
        WHEN v.idvistoriador IS NOT NULL THEN 'Vistoriador'
        WHEN a.idadministrador IS NOT NULL THEN 'Administrador'
        ELSE 'Funcionário'
      END AS cargo
    FROM funcionario f
    LEFT JOIN vistoriador v ON v.idvistoriador = f.id
    LEFT JOIN administrador a ON a.idadministrador = f.id
    WHERE f.id = ${idNum}
  `;
  return f;
}

async function criar({
  cpf,
  email,
  nome,
  senha,
  telefone,
  cargo,
  imagemdeperfil = null,
}) {
  if (!senha) {
    const err = new Error("Senha é obrigatória.");
    err.statusCode = 400;
    throw err;
  }

  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

  const [f] = await db`
    INSERT INTO funcionario (cpf, email, nome, senha, telefone, imagemdeperfil)
    VALUES (${cpf}, ${email}, ${nome}, ${senhaHash}, ${telefone}, ${imagemdeperfil})
    RETURNING *
  `;

  if (cargo === "Administrador") {
    await db`INSERT INTO administrador (idadministrador) VALUES (${f.id})`;
  } else if (cargo === "Vistoriador") {
    await db`INSERT INTO vistoriador (idvistoriador) VALUES (${f.id})`;
  }

  return { ...f, cargo };
}

// ATUALIZAR POR ID (fluxo admin)
async function atualizar(id, dados, imagemdeperfilFilenameOrNull = null) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;

  const [existente] = await db`SELECT * FROM funcionario WHERE id = ${idNum}`;
  if (!existente) return null;

  const { cpf, email, nome, senha, telefone } = dados;

  const senhaFinal = senha ? await bcrypt.hash(senha, SALT_ROUNDS) : existente.senha;

  const imagemdeperfilFinal =
    imagemdeperfilFilenameOrNull ?? existente.imagemdeperfil;

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

  return f;
}

async function deletar(id) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return false;

  const result = await db`
    DELETE FROM funcionario WHERE id = ${idNum} RETURNING *
  `;
  return result.length > 0;
}

async function atualizarCargo(id, cargo) {
  const idNum = Number(id);
  if (Number.isNaN(idNum))
    return { ok: false, status: 400, msg: "ID inválido." };

  if (!["Administrador", "Vistoriador"].includes(cargo)) {
    return { ok: false, status: 400, msg: "Cargo inválido." };
  }

  const [func] = await db`SELECT id FROM funcionario WHERE id = ${idNum}`;
  if (!func) return { ok: false, status: 404, msg: "Funcionário não encontrado." };

  await db.begin(async (tx) => {
    await tx`DELETE FROM administrador WHERE idadministrador = ${idNum}`;
    await tx`DELETE FROM vistoriador WHERE idvistoriador = ${idNum}`;

    if (cargo === "Administrador") {
      await tx`INSERT INTO administrador (idadministrador) VALUES (${idNum})`;
    } else {
      await tx`INSERT INTO vistoriador (idvistoriador) VALUES (${idNum})`;
    }
  });

  return { ok: true };
}

/* ======= NOVO: PERFIL DO FUNCIONÁRIO LOGADO (MESMO PADRÃO DO CLIENTE) ======= */

// GET /funcionarios/me
async function buscarMeuPerfil(idFuncionario) {
  const id = Number(idFuncionario);
  if (Number.isNaN(id)) return null;

  const [f] = await db`
    SELECT 
      f.id, f.nome, f.cpf, f.email, f.telefone, f.imagemdeperfil,
      CASE 
        WHEN v.idvistoriador IS NOT NULL THEN 'Vistoriador'
        WHEN a.idadministrador IS NOT NULL THEN 'Administrador'
        ELSE 'Funcionário'
      END AS cargo
    FROM funcionario f
    LEFT JOIN vistoriador v ON v.idvistoriador = f.id
    LEFT JOIN administrador a ON a.idadministrador = f.id
    WHERE f.id = ${id}
  `;
  return f;
}

// PATCH /funcionarios/me  (sem senha, sem imagem)
async function atualizarMeuPerfil(idFuncionario, { nome, cpf, email, telefone }) {
  const id = Number(idFuncionario);
  if (Number.isNaN(id)) return null;

  const [existente] = await db`SELECT * FROM funcionario WHERE id = ${id}`;
  if (!existente) return null;

  // ⚠️ não mexe em senha aqui
  const [atualizado] = await db`
    UPDATE funcionario SET
      nome = ${nome ?? existente.nome},
      cpf = ${cpf ?? existente.cpf},
      email = ${email ?? existente.email},
      telefone = ${telefone ?? existente.telefone}
    WHERE id = ${id}
    RETURNING id, nome, cpf, email, telefone, imagemdeperfil
  `;

  // cargo vem via lookup (pra devolver completo)
  const perfilCompleto = await buscarMeuPerfil(id);
  return perfilCompleto ?? atualizado;
}

// PUT /funcionarios/me/avatar (somente imagem)
async function atualizarMeuAvatar(idFuncionario, filenameNovoOrNull) {
  const id = Number(idFuncionario);
  if (Number.isNaN(id)) {
    // se veio upload e ID é inválido, limpa o arquivo novo
    if (filenameNovoOrNull) {
      safeUnlink(path.join(FUNCIONARIO_UPLOAD_DIR, filenameNovoOrNull));
    }
    return null;
  }

  const caminhoNovo = filenameNovoOrNull
    ? path.join(FUNCIONARIO_UPLOAD_DIR, filenameNovoOrNull)
    : null;

  try {
    const [existente] = await db`SELECT * FROM funcionario WHERE id = ${id}`;
    if (!existente) {
      // funcionário não existe -> remove upload novo (se houver)
      safeUnlink(caminhoNovo);
      return null;
    }

    const filenameAntigo = existente.imagemdeperfil ? String(existente.imagemdeperfil) : null;

    // define qual vai pro banco (se você permitir "null", mantém o padrão atual)
    const imagemdeperfilFinal = filenameNovoOrNull ?? existente.imagemdeperfil;

    // 1) atualiza banco primeiro
    await db`
      UPDATE funcionario
      SET imagemdeperfil = ${imagemdeperfilFinal}
      WHERE id = ${id}
    `;

    // 2) remove avatar antigo APÓS sucesso (somente se trocou por outro)
    if (filenameNovoOrNull && filenameAntigo && filenameAntigo !== filenameNovoOrNull) {
      safeUnlink(path.join(FUNCIONARIO_UPLOAD_DIR, filenameAntigo));
    }

    return buscarMeuPerfil(id);
  } catch (err) {
    // erro -> remove upload novo (se houver) para não deixar lixo
    safeUnlink(caminhoNovo);
    throw err;
  }
}

// PUT /funcionarios/me/senha  (valida senha atual)
async function alterarMinhaSenha(idFuncionario, senhaAtual, senhaNova) {
  const id = Number(idFuncionario);
  if (Number.isNaN(id)) return { ok: false, status: 400, msg: "ID inválido." };

  const [existente] = await db`SELECT * FROM funcionario WHERE id = ${id}`;
  if (!existente) return { ok: false, status: 404, msg: "Funcionário não encontrado." };

  const okAtual = await bcrypt.compare(senhaAtual, existente.senha);
  if (!okAtual) return { ok: false, status: 400, msg: "Senha atual incorreta." };

  const senhaHash = await bcrypt.hash(senhaNova, SALT_ROUNDS);

  await db`
    UPDATE funcionario
    SET senha = ${senhaHash}
    WHERE id = ${id}
  `;

  return { ok: true };
}

module.exports = {
  listarComCargo,
  buscarPorIdComCargo,
  buscarPerfil,
  criar,
  atualizar,
  deletar,
  atualizarCargo,
  buscarMeuPerfil,
  atualizarMeuPerfil,
  atualizarMeuAvatar,
  alterarMinhaSenha,
};