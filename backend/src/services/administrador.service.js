const db = require('../config/db');

// Listar admins
async function listar() {
  return db`SELECT * FROM administrador`;
}

// Deletar admin + funcionario
async function deletar(idadministrador) {
  const resultAdmin = await db`
    DELETE FROM administrador
    WHERE idadministrador = ${idadministrador}
    RETURNING *
  `;

  if (resultAdmin.length === 0) return false;

  await db`
    DELETE FROM funcionario
    WHERE id = ${idadministrador}
  `;

  return true;
}

module.exports = { listar, deletar };
