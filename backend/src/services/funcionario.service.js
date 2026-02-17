const db = require('../config/db');
const bcrypt = require('bcrypt');

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

async function criar({ cpf, email, nome, senha, telefone, cargo, imagemdeperfil = null }) {
  if (!senha) {
    const err = new Error('Senha é obrigatória.');
    err.statusCode = 400;
    throw err;
  }

  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

  const [f] = await db`
    INSERT INTO funcionario (cpf, email, nome, senha, telefone, imagemdeperfil)
    VALUES (${cpf}, ${email}, ${nome}, ${senhaHash}, ${telefone}, ${imagemdeperfil})
    RETURNING *
  `;

  if (cargo === 'Administrador') {
    await db`INSERT INTO administrador (idadministrador) VALUES (${f.id})`;
  } else if (cargo === 'Vistoriador') {
    await db`INSERT INTO vistoriador (idvistoriador) VALUES (${f.id})`;
  }

  return { ...f, cargo };
}

async function atualizar(id, dados, imagemdeperfilFilenameOrNull = null) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;

  const [existente] = await db`SELECT * FROM funcionario WHERE id = ${idNum}`;
  if (!existente) return null;

  const { cpf, email, nome, senha, telefone } = dados;

  const senhaFinal = senha
    ? await bcrypt.hash(senha, SALT_ROUNDS)
    : existente.senha;

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
  if (Number.isNaN(idNum)) return { ok: false, status: 400, msg: 'ID inválido.' };

  if (!['Administrador', 'Vistoriador'].includes(cargo)) {
    return { ok: false, status: 400, msg: 'Cargo inválido.' };
  }

  const [func] = await db`SELECT id FROM funcionario WHERE id = ${idNum}`;
  if (!func) return { ok: false, status: 404, msg: 'Funcionário não encontrado.' };

  await db.begin(async (tx) => {
    await tx`DELETE FROM administrador WHERE idadministrador = ${idNum}`;
    await tx`DELETE FROM vistoriador WHERE idvistoriador = ${idNum}`;

    if (cargo === 'Administrador') {
      await tx`INSERT INTO administrador (idadministrador) VALUES (${idNum})`;
    } else {
      await tx`INSERT INTO vistoriador (idvistoriador) VALUES (${idNum})`;
    }
  });

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
};
