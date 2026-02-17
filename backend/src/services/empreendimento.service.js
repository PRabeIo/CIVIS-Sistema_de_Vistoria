const db = require('../config/db');

async function criar({ nome, construtora, estado, cidade, cep, rua, anexos }) {
  const [empreendimento] = await db`
    INSERT INTO empreendimento (nome, construtora, estado, cidade, cep, rua, anexos)
    VALUES (${nome}, ${construtora}, ${estado}, ${cidade}, ${cep}, ${rua}, ${anexos})
    RETURNING *
  `;
  return empreendimento;
}

async function listar() {
  const empreendimentos = await db`
    SELECT * FROM empreendimento ORDER BY idempreendimento DESC
  `;
  return empreendimentos;
}

async function buscarPorId(id) {
  const [empreendimento] = await db`
    SELECT * FROM empreendimento WHERE idempreendimento = ${id}
  `;
  return empreendimento; // pode vir undefined
}

async function listarImoveisDoEmpreendimento(idEmpreendimento) {
  const imoveis = await db`
    SELECT
      i.*,

      v.idvistoria       AS idvistoria_atual,
      v.status           AS status_vistoria,
      v.observacoes      AS observacoes_vistoria,
      v.dataagendada     AS dataagendada_vistoria,
      v.datahorainicio   AS datahorainicio_vistoria,
      v.datahorafim      AS datahorafim_vistoria

    FROM imovel i
    LEFT JOIN LATERAL (
      SELECT idvistoria, status, observacoes, dataagendada, datahorainicio, datahorafim
      FROM vistoria
      WHERE idimovel = i.idimovel
      ORDER BY idvistoria DESC
      LIMIT 1
    ) v ON true

    WHERE i.idempreendimento = ${idEmpreendimento}
    ORDER BY i.idimovel DESC
  `;

  return imoveis;
}


async function atualizar(id, { nome, construtora, estado, cidade, cep, rua, anexos }) {
  const existente = await buscarPorId(id);
  if (!existente) return null;

  await db`
    UPDATE empreendimento SET
      nome = ${nome ?? existente.nome},
      construtora = ${construtora ?? existente.construtora},
      estado = ${estado ?? existente.estado},
      cidade = ${cidade ?? existente.cidade},
      cep = ${cep ?? existente.cep},
      rua = ${rua ?? existente.rua},
      anexos = ${anexos ?? existente.anexos}
    WHERE idempreendimento = ${id}
  `;

  return true;
}

async function deletar(id) {
  // Melhor que "count": RETURNING garante saber se existia
  const deletados = await db`
    DELETE FROM empreendimento
    WHERE idempreendimento = ${id}
    RETURNING *
  `;

  return deletados.length > 0;
}

module.exports = {
  criar,
  listar,
  buscarPorId,
  listarImoveisDoEmpreendimento,
  atualizar,
  deletar,
};
