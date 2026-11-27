const { mascararCpf } = require("../domain/lgpd");
const { AppError } = require("../domain/erros");
const { STATUS } = require("../domain/vistoriaStatus");
const { transicionar, listarEventos } = require("./transicao.service");
const db = require('../config/db');

/** Admin: todas as vistorias com cliente, imóvel, empreendimento e vistoriador (B7). */
async function listarTodas() {
  return db`
    SELECT
      v.idvistoria, v.idcliente, v.idimovel, v.idvistoriador, v.status,
      v.dataagendada, v.datahorainicio, v.datahorafim,
      CASE WHEN v.relatorio_arquivo IS NOT NULL THEN '/vistorias/' || v.idvistoria || '/relatorio' END AS relatorio_url,
      c.nome AS nomecliente,
      i.descricao, i.bloco, i.numero,
      e.nome AS nomeempreendimento,
      f.nome AS nomevistoriador
    FROM vistoria v
    LEFT JOIN cliente c ON c.idcliente = v.idcliente
    LEFT JOIN imovel i ON i.idimovel = v.idimovel
    LEFT JOIN empreendimento e ON e.idempreendimento = i.idempreendimento
    LEFT JOIN funcionario f ON f.id = v.idvistoriador
    ORDER BY COALESCE(v.dataagendada, v.datahorainicio) DESC NULLS LAST, v.idvistoria DESC
  `;
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
      CASE WHEN v.relatorio_arquivo IS NOT NULL THEN '/vistorias/' || v.idvistoria || '/relatorio' END AS relatorio_url,

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
  if (usuario?.papel === "admin") return vistoria;

  // Cliente só vê as dele
  if (usuario?.papel === "cliente") {
    return Number(vistoria.idcliente) === Number(usuario.sub) ? vistoria : null;
  }

  // Vistoriador (S11: vê o CPF do cliente mascarado)
  if (usuario?.papel === "vistoriador") {
    vistoria.cpfcliente = mascararCpf(vistoria.cpfcliente);
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
      CASE WHEN v.relatorio_arquivo IS NOT NULL THEN '/vistorias/' || v.idvistoria || '/relatorio' END AS relatorio_url,
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

/** Monta o timestamp do agendamento (fuso -03:00) e exige data futura. */
function dataDoAgendamento({ dataagendada, horaagendada }) {
  const hora = String(horaagendada).length === 5 ? `${horaagendada}:00` : String(horaagendada);
  const ts = `${dataagendada}T${hora}-03:00`;
  const dt = new Date(ts);
  if (Number.isNaN(dt.getTime())) throw new AppError(400, "VALIDACAO", "Data/hora inválida.");
  if (dt.getTime() <= Date.now()) throw new AppError(400, "VALIDACAO", "Escolha uma data e hora no futuro.");
  return dt;
}

/** F1: cliente dono agenda (Aguardando Agendamento → Agendada). */
async function agendar(idvistoria, ator, dados) {
  return transicionar({
    idvistoria: Number(idvistoria),
    acao: "agendar",
    ator,
    campos: { dataagendada: dataDoAgendamento(dados) },
  });
}

/**
 * Admin corrige dados da vistoria. F1: o status NÃO muda por aqui (só pelas ações da máquina de estados).
 */
async function atualizar(idvistoria, payload) {
  const id = Number(idvistoria);
  const [atual] = await db`SELECT * FROM vistoria WHERE idvistoria = ${id}`;
  if (!atual) return null;

  const { dataagendada, datahorainicio, datahorafim, condicoesclimaticas, imprevistos, observacoes, observacoesgerais } =
    payload;

  await db`
    UPDATE vistoria SET
      dataagendada = ${dataagendada ?? atual.dataagendada},
      datahorainicio = ${datahorainicio ?? atual.datahorainicio},
      datahorafim = ${datahorafim ?? atual.datahorafim},
      condicoesclimaticas = ${condicoesclimaticas ?? atual.condicoesclimaticas},
      imprevistos = ${imprevistos ?? atual.imprevistos},
      observacoes = ${observacoes ?? observacoesgerais ?? atual.observacoes}
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
 * F1: vistoriador inicia (Agendada/Reagendada → Em Andamento). Se a vistoria estava no pool, ele a assume.
 * Chamar de novo numa vistoria que já é dele e está em andamento só devolve a vistoria (sem novo evento).
 */
async function iniciar(idvistoria, ator) {
  const id = Number(idvistoria);
  const [atual] = await db`SELECT * FROM vistoria WHERE idvistoria = ${id}`;
  if (atual && atual.status === STATUS.emAndamento && Number(atual.idvistoriador) === Number(ator.sub)) {
    return atual;
  }
  return transicionar({
    idvistoria: id,
    acao: "iniciar",
    ator,
    campos: (v) => ({
      idvistoriador: v.idvistoriador ?? ator.sub,
      datahorainicio: v.datahorainicio ?? new Date(),
    }),
  });
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
    SELECT v.*, CASE WHEN v.relatorio_arquivo IS NOT NULL THEN '/vistorias/' || v.idvistoria || '/relatorio' END AS relatorio_url, i.descricao, e.nome AS nomeempreendimento
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
    SELECT v.idvistoria, CASE WHEN v.relatorio_arquivo IS NOT NULL THEN '/vistorias/' || v.idvistoria || '/relatorio' END AS relatorio_url, v.status,
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

/** F1: cliente dono valida o relatório (Aguardando Validação → Validada). */
async function validar(idvistoria, ator) {
  return transicionar({ idvistoria: Number(idvistoria), acao: "validar", ator });
}

/** F1: cliente pede nova visita depois de rejeitar (Rejeitada → Reagendada). O F3 refaz esta regra. */
async function reagendar(idvistoria, ator, dados) {
  return transicionar({
    idvistoria: Number(idvistoria),
    acao: "reagendar",
    ator,
    motivo: dados.motivo,
    campos: { dataagendada: dataDoAgendamento(dados) },
  });
}

/** F1: cliente rejeita o relatório (Aguardando Validação → Rejeitada). O F2 exige motivo e cria a revisão. */
async function rejeitar(idvistoria, ator, motivo) {
  return transicionar({
    idvistoria: Number(idvistoria),
    acao: "rejeitar",
    ator,
    motivo,
    campos: { datahorafim: new Date() },
  });
}

/** F1: vistoriador da vistoria finaliza (Validada → Finalizada). */
async function finalizar(idvistoria, ator) {
  return transicionar({
    idvistoria: Number(idvistoria),
    acao: "finalizar",
    ator,
    campos: (v) => ({ datahorafim: v.datahorafim ?? new Date() }),
  });
}

/** F1/F7: admin cancela antes do início, com motivo (→ Vistoria Cancelada). */
async function cancelar(idvistoria, ator, motivo) {
  return transicionar({ idvistoria: Number(idvistoria), acao: "cancelar", ator, motivo });
}

/** D5: linha do tempo, para quem pode ver a vistoria. */
async function eventos(idvistoria, usuario) {
  const v = await buscarPorIdComAcesso(idvistoria, usuario);
  return v ? listarEventos(Number(idvistoria)) : null;
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
  cancelar,
  eventos,
};
