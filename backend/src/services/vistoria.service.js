const db = require('../config/db');

async function listarTodas() {
  return db`SELECT * FROM vistoria`;
}

async function buscarPorId(idvistoria) {
  const id = Number(idvistoria);
  if (Number.isNaN(id)) {
    const err = new Error("ID inválido.");
    err.statusCode = 400;
    throw err;
  }

  const [vistoria] = await db`
    SELECT 
      v.*,

      -- dados do imóvel
      i.observacoes,
      i.descricao,
      i.bloco,
      i.numero,
      i.vistoriasrealizadas,

      -- dados do empreendimento
      CASE
        WHEN e.anexos IS NULL OR e.anexos = '' THEN NULL
        ELSE ('empreendimentos/' || e.anexos)
      END AS anexos,
      e.nome AS nomeempreendimento,
      e.cidade,
      e.estado,
      e.cep,
      e.rua,

      -- dados do cliente
      c.nome AS nomecliente,
      c.cpf AS cpfcliente,

      -- nome do vistoriador (vem de funcionario)
      f.nome AS nomevistoriador

    FROM vistoria v
    JOIN imovel i ON v.idimovel = i.idimovel
    JOIN cliente c ON i.idcliente = c.idcliente
    JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    LEFT JOIN funcionario f ON v.idvistoriador = f.id

    WHERE v.idvistoria = ${id}
    LIMIT 1
  `;

  return vistoria;
}


async function buscarPorIdComAcesso(idvistoria, usuario) {
  const vistoria = await buscarPorId(idvistoria);
  if (!vistoria) return null;

  // Admin vê tudo
  if (usuario?.cargo === "Administrador") return vistoria;

  // Cliente só vê as dele
  if (usuario?.tipo === "cliente") {
    return Number(vistoria.idcliente) === Number(usuario.sub) ? vistoria : null;
  }

  // Vistoriador
  if (usuario?.cargo === "Vistoriador") {
    // se já for dele
    if (Number(vistoria.idvistoriador) === Number(usuario.sub)) return vistoria;

    // se estiver disponível (sem vistoriador)
    if (
      vistoria.idvistoriador == null &&
      ["Vistoria Agendada", "Vistoria Reagendada"].includes(vistoria.status)
    ) {
      return vistoria;
    }
    return null;
  }
  return null;
}

/**
 * NOVO - Cliente lista TODAS as vistorias dele
 */
async function listarMinhas(idcliente) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }

  return db`
    SELECT
      v.*,
      i.descricao, i.bloco, i.numero,
      e.nome AS nomeempreendimento
    FROM vistoria v
    JOIN imovel i ON v.idimovel = i.idimovel
    JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    WHERE v.idcliente = ${id}
    ORDER BY v.idvistoria DESC
  `;
}

/**
 * NOVO - Vistoriador lista vistorias atribuídas a ele
 */
async function listarMinhasVistoriador(idvistoriador) {
  const idv = Number(idvistoriador);
  if (Number.isNaN(idv)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }
  return db`
    SELECT
      v.idvistoria,
      v.status,
      v.dataagendada,
      v.datahorainicio,
      v.datahorafim,
      v.idvistoriador,
      i.idimovel,
      i.descricao,
      i.bloco,
      i.numero,
      e.nome AS nomeempreendimento,
      CASE
        WHEN e.anexos IS NULL OR e.anexos = '' THEN NULL
        ELSE ('empreendimentos/' || e.anexos)
      END AS imagemempreendimento,
      c.nome AS nomecliente
    FROM vistoria v
    JOIN imovel i ON v.idimovel = i.idimovel
    LEFT JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    JOIN cliente c ON v.idcliente = c.idcliente
    WHERE v.idvistoriador = ${idv}
    ORDER BY v.idvistoria DESC
  `;
}

/**
 * Cliente agenda (somente se for dele)
 * Aguardando Agendamento -> Vistoria Agendada
 */
async function agendar(idvistoria, idcliente, { dataagendada, horaagendada }) {
  const id = Number(idvistoria);
  const idc = Number(idcliente);

  if (Number.isNaN(id) || Number.isNaN(idc)) {
    const err = new Error("ID inválido.");
    err.statusCode = 400;
    throw err;
  }

  if (!dataagendada || !horaagendada) {
    const err = new Error("Data e hora são obrigatórias.");
    err.statusCode = 400;
    throw err;
  }

  // normaliza hora: "HH:mm" -> "HH:mm:00"
  const hora = String(horaagendada).length === 5 ? `${horaagendada}:00` : String(horaagendada);

  // valida formato básico (evita "99:99")
  const hhmmssOk = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(hora);
  if (!hhmmssOk) {
    const err = new Error("Hora inválida. Use HH:mm ou HH:mm:ss.");
    err.statusCode = 400;
    throw err;
  }

  // monta timestamp com timezone -03:00 (seu padrão)
  const ts = `${dataagendada}T${hora}-03:00`;

  // ✅ valida no backend: não pode agendar no passado/igual agora
  const dt = new Date(ts);
  if (Number.isNaN(dt.getTime())) {
    const err = new Error("Data/hora inválida.");
    err.statusCode = 400;
    throw err;
  }

  if (dt.getTime() <= Date.now()) {
    const err = new Error("Escolha uma data e hora no futuro.");
    err.statusCode = 400;
    throw err;
  }

  // status que podem agendar (se quiser só 1, deixe só o primeiro)
  const statusPermitidos = [
    "Aguardando Agendamento da Vistoria",
    // "Vistoria Reagendada",
  ];

  const [vistoriaAtualizada] = await db`
    UPDATE vistoria
    SET dataagendada = ${ts}::timestamptz,
        status = 'Vistoria Agendada'
    WHERE idvistoria = ${id}
      AND idcliente = ${idc}
      AND status = ANY(${statusPermitidos}::public.status_vistoria[])
    RETURNING *
  `;

  return vistoriaAtualizada;
}


/**
 * Atualização genérica (admin)
 */
async function atualizar(idvistoria, payload) {
  const id = Number(idvistoria);
  if (Number.isNaN(id)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }

  const {
    dataagendada,
    datahorainicio,
    datahorafim,
    condicoesclimaticas,
    imprevistos,
    observacoes,
    observacoesgerais,
    status,
    relatorio_url,
  } = payload;

  const [vistoriaExistente] = await db`
    SELECT * FROM vistoria WHERE idvistoria = ${id}
  `;

  if (!vistoriaExistente) return null;

  const observacoesFinal =
    observacoes ?? observacoesgerais ?? vistoriaExistente.observacoes;

  await db`
    UPDATE vistoria SET
      dataagendada = ${dataagendada ?? vistoriaExistente.dataagendada},
      datahorainicio = ${datahorainicio ?? vistoriaExistente.datahorainicio},
      datahorafim = ${datahorafim ?? vistoriaExistente.datahorafim},
      condicoesclimaticas = ${condicoesclimaticas ?? vistoriaExistente.condicoesclimaticas},
      imprevistos = ${imprevistos ?? vistoriaExistente.imprevistos},
      observacoes = ${observacoesFinal},
      status = ${status ?? vistoriaExistente.status},
      relatorio_url = ${relatorio_url ?? vistoriaExistente.relatorio_url}
    WHERE idvistoria = ${id}
  `;

  return true;
}

async function deletar(idvistoria) {
  const id = Number(idvistoria);
  if (Number.isNaN(id)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }

  const deletados = await db`
    DELETE FROM vistoria
    WHERE idvistoria = ${id}
    RETURNING *
  `;

  return deletados.length > 0;
}

/**
 * Vistoriador inicia
 */
async function iniciar(idvistoria, idvistoriador) {
  const id = Number(idvistoria);
  const idv = Number(idvistoriador);

  if (Number.isNaN(id) || Number.isNaN(idv)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date().toISOString();

  const [vistoriaAtualizada] = await db`
    UPDATE vistoria
    SET 
      idvistoriador = COALESCE(idvistoriador, ${idv}),
      datahorainicio = COALESCE(datahorainicio, ${now}),
      status = CASE
        WHEN status IN ('Vistoria Agendada', 'Vistoria Reagendada') THEN 'Em Andamento'
        ELSE status
      END
    WHERE idvistoria = ${id}
      AND (
        (status IN ('Vistoria Agendada', 'Vistoria Reagendada') AND (idvistoriador IS NULL OR idvistoriador = ${idv}))
        OR
        (status = 'Em Andamento' AND idvistoriador = ${idv})
      )
    RETURNING *
  `;

  return vistoriaAtualizada;
}


/**
 * Cliente - pendentes agendamento
 */
async function pendentesAgendamentoCliente(idcliente) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }

  return db`
    SELECT v.*, i.descricao, e.nome AS nomeempreendimento
    FROM vistoria v
    JOIN imovel i ON v.idimovel = i.idimovel
    JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    WHERE v.idcliente = ${id}
      AND v.status = 'Aguardando Agendamento da Vistoria'
  `;
}

async function pendentesValidacaoCliente(idcliente) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }

  return db`
    SELECT v.idvistoria, v.relatorio_url, v.status,
      i.idimovel, i.descricao, i.bloco, i.numero,
      e.nome AS nomeempreendimento, e.anexos AS imagemempreendimento
    FROM vistoria v
    JOIN imovel i ON v.idimovel = i.idimovel
    JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    WHERE v.idcliente = ${id}
      AND v.status = 'Aguardando Validação'
  `;
}


async function aguardandoValidacaoCliente(idcliente) {
  const id = Number(idcliente);
  if (Number.isNaN(id)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }

  return db`
    SELECT
      v.idvistoria,
      v.idimovel,
      i.descricao,
      i.bloco,
      i.numero,
      e.nome AS nomeempreendimento
    FROM vistoria v
    JOIN imovel i ON v.idimovel = i.idimovel
    JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    WHERE v.idcliente = ${id}
      AND v.status = 'Aguardando Validação'
    ORDER BY v.idvistoria DESC
  `;
}

// Cliente Valida
async function validar(idvistoria, idcliente) {
  const id = Number(idvistoria);
  const idc = Number(idcliente);

  if (Number.isNaN(id) || Number.isNaN(idc)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }

  const [ok] = await db`
    UPDATE vistoria
    SET status = 'Vistoria Validada'
    WHERE idvistoria = ${id}
      AND idcliente = ${idc}
      AND status = 'Aguardando Validação'
    RETURNING idvistoria
  `;

  return !!ok;
}


async function reagendar(idvistoria, idcliente, { dataagendada, horaagendada }) {
  const id = Number(idvistoria);
  const idc = Number(idcliente);

  if (Number.isNaN(id) || Number.isNaN(idc)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }

  if (!dataagendada || !horaagendada) {
    const err = new Error('Data e hora são obrigatórias.');
    err.statusCode = 400;
    throw err;
  }

  const hora = horaagendada.length === 5 ? `${horaagendada}:00` : horaagendada;
  const ts = `${dataagendada}T${hora}-03:00`;

  const [vistoriaAtualizada] = await db`
    UPDATE vistoria
    SET dataagendada = ${ts}::timestamptz,
        status = 'Vistoria Reagendada'
    WHERE idvistoria = ${id}
      AND idcliente = ${idc}
      AND status IN ('Aguardando Validação', 'Vistoria Rejeitada')
    RETURNING *
  `;

  return vistoriaAtualizada;
}

async function rejeitar(idvistoria, idcliente) {
  const id = Number(idvistoria);
  const idc = Number(idcliente);

  if (Number.isNaN(id) || Number.isNaN(idc)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date().toISOString();

  const [vistoriaAtualizada] = await db`
    UPDATE vistoria
    SET status = 'Vistoria Rejeitada',
        datahorafim = ${now}
    WHERE idvistoria = ${id}
      AND idcliente = ${idc}
      AND status = 'Aguardando Validação'
    RETURNING *
  `;

  return vistoriaAtualizada;
}

async function finalizar(idvistoria, idvistoriador) {
  const id = Number(idvistoria);
  const idv = Number(idvistoriador);

  if (Number.isNaN(id) || Number.isNaN(idv)) {
    const err = new Error('ID inválido.');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date().toISOString();

  const [atualizada] = await db`
    UPDATE vistoria
    SET status = 'Vistoria Finalizada',
        datahorafim = COALESCE(datahorafim, ${now})
    WHERE idvistoria = ${id}
      AND idvistoriador = ${idv}
      AND status = 'Vistoria Validada'
    RETURNING *
  `;

  return atualizada;
}

// Vistorias disponíveis para qualquer vistoriador assumir
async function listarDisponiveisVistoriador() {
  return db`
    SELECT
      v.idvistoria,
      v.status,
      v.dataagendada,
      v.datahorainicio,
      v.datahorafim,
      v.idvistoriador,
      i.idimovel,
      i.descricao,
      i.bloco,
      i.numero,
      e.nome AS nomeempreendimento,
      CASE
        WHEN e.anexos IS NULL OR e.anexos = '' THEN NULL
        ELSE ('empreendimentos/' || e.anexos)
      END AS imagemempreendimento
    FROM vistoria v
    JOIN imovel i ON v.idimovel = i.idimovel
    LEFT JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    WHERE v.status IN ('Vistoria Agendada', 'Vistoria Reagendada')
      AND v.idvistoriador IS NULL
    ORDER BY v.dataagendada ASC NULLS LAST, v.idvistoria DESC
  `;
}

module.exports = {
  listarTodas,
  buscarPorId,
  buscarPorIdComAcesso,

  listarMinhas,
  listarMinhasVistoriador,
  listarDisponiveisVistoriador,

  agendar,
  atualizar,
  deletar,
  iniciar,

  pendentesAgendamentoCliente,
  pendentesValidacaoCliente,
  validar,
  aguardandoValidacaoCliente,

  reagendar,
  rejeitar,
  finalizar,
};
