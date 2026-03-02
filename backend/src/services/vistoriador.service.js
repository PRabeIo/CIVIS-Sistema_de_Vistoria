const db = require('../config/db');

async function listar() {
  return db`
    SELECT 
      v.idvistoriador,
      f.nome,
      f.cpf
    FROM vistoriador v
    JOIN funcionario f ON v.idvistoriador = f.id
    ORDER BY v.idvistoriador DESC
  `;
}

async function buscarPorId(id) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;

  const [vistoriador] = await db`
    SELECT 
      v.idvistoriador,
      f.nome,
      f.cpf,
      f.email,
      f.telefone,
      f.imagemdeperfil
    FROM vistoriador v
    JOIN funcionario f ON v.idvistoriador = f.id
    WHERE v.idvistoriador = ${idNum}
  `;

  return vistoriador;
}

// remove o "cargo vistoriador" do funcionário (não deleta o funcionário)
async function removerCargo(id) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;

  const result = await db`
    DELETE FROM vistoriador
    WHERE idvistoriador = ${idNum}
    RETURNING *
  `;

  return result.length > 0;
}

module.exports = {
  listar,
  buscarPorId,
  removerCargo,
};
