const db = require('../config/db');

function badRequest(msg) {
  const err = new Error(msg);
  err.statusCode = 400;
  return err;
}


/**
 * Cria um imóvel e imediatamente cria uma vistoria vinculada a ele
 * com status "Aguardando Agendamento da Vistoria".
 */
async function criarImovelComVistoria({ descricao, bloco, numero, idcliente, idempreendimento }) {
  if (!descricao || !numero || !idcliente || !idempreendimento) {
    throw badRequest('Campos obrigatórios faltando.');
  }

  const idClienteNum = Number(idcliente);
  const idEmpreendimentoNum = Number(idempreendimento);

  if (Number.isNaN(idClienteNum) || Number.isNaN(idEmpreendimentoNum)) {
    throw badRequest('IDs inválidos.');
  }

  return db.begin(async (tx) => {
    const [novoImovel] = await tx`
      INSERT INTO imovel (
        descricao, bloco, numero, idcliente, idempreendimento, vistoriasrealizadas
      )
      VALUES (
        ${descricao}, ${bloco ?? null}, ${numero}, ${idClienteNum}, ${idEmpreendimentoNum}, 0
      )
      RETURNING *
    `;

    const [novaVistoria] = await tx`
      INSERT INTO vistoria (idimovel, idcliente, status)
      VALUES (${novoImovel.idimovel}, ${idClienteNum}, 'Aguardando Agendamento da Vistoria')
      RETURNING *
    `;

    return { imovel: novoImovel, vistoria: novaVistoria };
  });
}

async function listarPorEmpreendimento(empreendimentoid) {
  const id = Number(empreendimentoid);
  if (Number.isNaN(id)) throw badRequest('ID inválido.');

  const imoveis = await db`
    SELECT *
    FROM imovel
    WHERE idempreendimento = ${id}
    ORDER BY idimovel DESC
  `;
  return imoveis;
}

async function listarOrfaosSemVistoria(empreendimentoid) {
  const id = Number(empreendimentoid);
  if (Number.isNaN(id)) throw badRequest('ID inválido.');

  const imoveis = await db`
    SELECT *
    FROM imovel i
    WHERE i.idempreendimento = ${id}
      AND NOT EXISTS (
        SELECT 1 FROM vistoria v
        WHERE v.idimovel = i.idimovel
      )
    ORDER BY i.idimovel DESC
  `;

  return imoveis;
}

async function listarTodosComDados() {
  const imoveis = await db`
    SELECT 
      i.idimovel, i.descricao, i.bloco, i.numero,
      e.nome AS nomeempreendimento,
      v.dataagendada,
      v.idvistoria, v.status,
      CASE
        WHEN e.anexos IS NULL OR e.anexos = '' THEN NULL
        ELSE ('empreendimentos/' || e.anexos)
      END AS anexos
    FROM imovel i
    LEFT JOIN (
      SELECT DISTINCT ON (idimovel) *
      FROM vistoria
      ORDER BY idimovel, dataagendada DESC NULLS LAST, idvistoria DESC
    ) v ON i.idimovel = v.idimovel
    LEFT JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    ORDER BY i.idimovel DESC
  `;
  return imoveis;
}

async function listarVistoriasDosImoveisDoCliente(idcliente) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) throw badRequest('ID inválido.');

  const vistorias = await db`
    SELECT 
      v.idvistoria, v.status, v.dataagendada, v.datahorafim,
      i.idimovel, i.descricao, i.bloco, i.numero,
      e.nome AS nomeempreendimento,
      CASE
        WHEN e.anexos IS NULL OR e.anexos = '' THEN NULL
        ELSE ('empreendimentos/' || e.anexos)
      END AS anexos
    FROM vistoria v
    JOIN imovel i ON v.idimovel = i.idimovel
    LEFT JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    WHERE v.idcliente = ${id}
    ORDER BY v.dataagendada DESC NULLS LAST, v.idvistoria DESC
  `;

  return vistorias;
}

async function atualizarImovel(idimovel, { descricao, bloco, numero, idempreendimento, vistoriasrealizadas }) {
  const id = Number(idimovel);
  if (Number.isNaN(id)) throw badRequest('ID do imóvel inválido.');

  const [imovelExistente] = await db`
    SELECT * FROM imovel WHERE idimovel = ${id}
  `;
  if (!imovelExistente) return null;

  const novoEmpreendimento =
    idempreendimento !== undefined && idempreendimento !== null
      ? Number(idempreendimento)
      : imovelExistente.idempreendimento;

  if (Number.isNaN(novoEmpreendimento)) throw badRequest('idempreendimento inválido.');

  const [atualizado] = await db`
    UPDATE imovel SET
      descricao = ${descricao ?? imovelExistente.descricao},
      bloco = ${bloco ?? imovelExistente.bloco},
      numero = ${numero ?? imovelExistente.numero},
      idempreendimento = ${novoEmpreendimento},
      vistoriasrealizadas = ${vistoriasrealizadas ?? imovelExistente.vistoriasrealizadas}
    WHERE idimovel = ${id}
    RETURNING *
  `;

  return atualizado;
}

async function listarDisponiveisParaAgendamento(idcliente) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) throw badRequest('ID inválido.');

  const imoveis = await db`
    SELECT DISTINCT 
      v.idvistoria,
      i.idimovel, 
      i.descricao, 
      i.bloco, 
      i.numero,
      e.nome AS nomeempreendimento,
      CASE
        WHEN e.anexos IS NULL OR e.anexos = '' THEN NULL
        ELSE ('empreendimentos/' || e.anexos)
      END AS imagemempreendimento
    FROM imovel i
    JOIN vistoria v ON i.idimovel = v.idimovel
    JOIN cliente c ON v.idcliente = c.idcliente
    LEFT JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    WHERE c.idcliente = ${id}
      AND v.status = 'Aguardando Agendamento da Vistoria'
    ORDER BY i.idimovel DESC
  `;

  return imoveis;
}

async function listarMeusImoveis(idcliente) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) throw badRequest('ID inválido.');

  return db`
    SELECT
      i.idimovel,
      i.descricao,
      i.bloco,
      i.numero,
      i.observacoes,
      i.vistoriasrealizadas,

      e.idempreendimento,
      e.nome AS nomeempreendimento,
      e.cidade,
      e.estado,
      e.cep,
      e.rua,
      CASE
        WHEN e.anexos IS NULL OR e.anexos = '' THEN NULL
        ELSE ('empreendimentos/' || e.anexos)
      END AS anexos_empreendimento,

      v.idvistoria AS idvistoria_atual,
      v.status AS status_vistoria,
      v.dataagendada,
      v.datahorainicio,
      v.datahorafim,
      v.relatorio_url
    FROM imovel i
    LEFT JOIN empreendimento e ON e.idempreendimento = i.idempreendimento
    LEFT JOIN LATERAL (
      SELECT vv.*
      FROM vistoria vv
      WHERE vv.idimovel = i.idimovel
      ORDER BY vv.idvistoria DESC
      LIMIT 1
    ) v ON TRUE
    WHERE i.idcliente = ${id}
    ORDER BY i.idimovel DESC
  `;
}

async function buscarMeuImovelPorId(idcliente, idimovel) {
  const idc = Number(idcliente);
  const idi = Number(idimovel);

  if (Number.isNaN(idc) || Number.isNaN(idi)) throw badRequest('ID inválido.');

  const [row] = await db`
    SELECT
      i.*,
      e.nome AS nomeempreendimento,
      e.cidade,
      e.estado,
      e.cep,
      e.rua,
      CASE
        WHEN e.anexos IS NULL OR e.anexos = '' THEN NULL
        ELSE ('empreendimentos/' || e.anexos)
      END AS anexos_empreendimento,

      v.idvistoria AS idvistoria_atual,
      v.status AS status_vistoria,
      v.dataagendada,
      v.datahorainicio,
      v.datahorafim,
      v.relatorio_url,
      v.idvistoriador
    FROM imovel i
    LEFT JOIN empreendimento e ON e.idempreendimento = i.idempreendimento
    LEFT JOIN LATERAL (
      SELECT vv.*
      FROM vistoria vv
      WHERE vv.idimovel = i.idimovel
      ORDER BY vv.idvistoria DESC
      LIMIT 1
    ) v ON TRUE
    WHERE i.idimovel = ${idi}
      AND i.idcliente = ${idc}
    LIMIT 1
  `;

  return row;
}

module.exports = {
  criarImovelComVistoria,
  listarPorEmpreendimento,
  listarOrfaosSemVistoria,
  listarTodosComDados,
  listarVistoriasDosImoveisDoCliente,
  atualizarImovel,
  listarDisponiveisParaAgendamento,
  listarMeusImoveis,
  buscarMeuImovelPorId,
};
