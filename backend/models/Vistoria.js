const express = require('express');
const router = express.Router();
const db = require('../db');

// GET: Listar todas as vistorias
router.get('/', async (req, res) => {
  try {
    const vistorias = await db`
      SELECT * FROM vistoria
    `;
    res.status(200).json(vistorias);
  } catch (err) {
    console.error('Erro ao listar vistorias:', err);
    res.status(500).json({ error: 'Erro ao listar vistorias.' });
  }
});

// GET: Buscar uma vistoria por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const idParsed = Number(id);

  if (isNaN(idParsed)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  try {
    const [vistoria] = await db`
    SELECT 
      v.*,
      i.observacoes,
      v.status,
      i.descricao,
      i.bloco,
      i.numero,
      i.vistoriasrealizadas,
      e.anexos,
      e.nome AS nomeempreendimento,
      e.cidade,
      e.estado,
      e.cep,
      e.rua,
      c.nome AS nomecliente,
      c.cpf AS cpfcliente
      FROM vistoria v
      JOIN imovel i ON v.idimovel = i.idimovel
      JOIN cliente c ON i.idcliente = c.idcliente
      JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
      WHERE v.idvistoria = ${idParsed}
    `;

    if (!vistoria) {
      return res.status(404).json({ error: 'Vistoria não encontrada.' });
    }

    res.status(200).json(vistoria);
  } catch (err) {
    console.error('Erro ao buscar vistoria:', err);
    res.status(500).json({ error: 'Erro ao buscar vistoria.' });
  }
});



// PUT: Agendar vistoria (cliente define data e hora)
router.put('/:idvistoria', async (req, res) => {
  const { idvistoria } = req.params;
  const { dataagendada, horaagendada } = req.body;

  const idParsed = Number(idvistoria);
  if (isNaN(idParsed)) {
    return res.status(400).json({ error: 'ID de vistoria inválido.' });
  }

  if (!dataagendada || !horaagendada) {
    return res.status(400).json({ error: 'Data e hora são obrigatórias.' });
  }

  try {
    // Exemplo: '2025-07-01T12:55:00-03:00'
    const isoDatetimeStr = `${dataagendada}T${horaagendada}:00-03:00`;
    const dataFinal = new Date(isoDatetimeStr);

    if (isNaN(dataFinal.getTime())) {
      return res.status(400).json({ error: 'Data e hora inválidas.' });
    }

    const [vistoriaAtualizada] = await db`
      UPDATE vistoria
      SET dataagendada = ${dataFinal.toISOString()}, status = 'Vistoria Agendada'
      WHERE idvistoria = ${idParsed} AND status = 'Aguardando Agendamento da Vistoria'
      RETURNING *
    `;

    if (!vistoriaAtualizada) {
      return res.status(404).json({ error: 'Vistoria não encontrada ou já agendada.' });
    }

    res.status(200).json({ message: 'Vistoria agendada com sucesso.' });
  } catch (error) {
    console.error('Erro ao agendar vistoria:', error);
    res.status(500).json({ error: 'Erro ao agendar vistoria.' });
  }
});



// PUT: Atualizar vistoria
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const idParsed = Number(id);
  const {
    dataagendada,
    datahorainicio,
    datahorafim,
    condicoesclimaticas,
    imprevistos,
    observacoesgerais,
    status,
    relatorio_url
  } = req.body;

  if (isNaN(idParsed)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  try {
    const [vistoriaExistente] = await db`
      SELECT * FROM vistoria WHERE idvistoria = ${idParsed}
    `;

    if (!vistoriaExistente) {
      return res.status(404).json({ error: 'Vistoria não encontrada.' });
    }

    await db`
      UPDATE vistoria SET
        dataagendada = ${dataagendada ?? vistoriaExistente.dataagendada},
        datahorainicio = ${datahorainicio ?? vistoriaExistente.datahorainicio},
        datahorafim = ${datahorafim ?? vistoriaExistente.datahorafim},
        condicoesclimaticas = ${condicoesclimaticas ?? vistoriaExistente.condicoesclimaticas},
        imprevistos = ${imprevistos ?? vistoriaExistente.imprevistos},
        observacoesgerais = ${observacoesgerais ?? vistoriaExistente.observacoesgerais},
        status = ${status ?? vistoriaExistente.status},
        relatorio_url = ${relatorio_url ?? vistoriaExistente.relatorio_url}
      WHERE idvistoria = ${idParsed}
    `;

    res.status(200).json({ message: 'Vistoria atualizada com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar vistoria:', err);
    res.status(500).json({ error: 'Erro ao atualizar vistoria.' });
  }
});

// DELETE: Excluir uma vistoria
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const idParsed = Number(id);

  if (isNaN(idParsed)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  try {
    await db`
      DELETE FROM vistoria WHERE idvistoria = ${idParsed}
    `;
    res.status(200).json({ message: 'Vistoria excluída com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir vistoria:', err);
    res.status(500).json({ error: 'Erro ao excluir vistoria.' });
  }
});

// PUT: Iniciar a vistoria
router.put('/iniciar/:id', async (req, res) => {
  const { id } = req.params;
  const idParsed = Number(id);

  if (isNaN(idParsed)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  const dataHoraInicio = new Date().toISOString();

  try {
    // Atualiza o status da vistoria e define a data/hora de início
    await db`
      UPDATE vistoria
      SET datahorainicio = ${dataHoraInicio},
          status = 'Em Andamento'
      WHERE idvistoria = ${idParsed}
    `;

    const [vistoria] = await db`
      SELECT idimovel FROM vistoria WHERE idvistoria = ${idParsed}
    `;

    if (!vistoria) {
      return res.status(404).json({ error: 'Vistoria não encontrada.' });
    }

    res.status(200).json({ message: 'Vistoria iniciada com sucesso.' });
  } catch (err) {
    console.error('Erro ao iniciar vistoria:', err);
    res.status(500).json({ error: 'Erro ao iniciar a vistoria.' });
  }
});


// GET: Vistorias pendentes de Agendamento para um cliente
router.get('/pendentes/cliente/:idcliente', async (req, res) => {
  const idCliente = Number(req.params.idcliente);
  if (isNaN(idCliente)) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const vistorias = await db`
      SELECT v.*, i.descricao, e.nome AS nomeempreendimento
      FROM vistoria v
      JOIN imovel i ON v.idimovel = i.idimovel
      JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
      WHERE v.idcliente = ${idCliente}
        AND v.status = 'Aguardando Agendamento da Vistoria'

    `;
    res.status(200).json(vistorias);
  } catch (err) {
    console.error('Erro ao buscar vistorias pendentes:', err);
    res.status(500).json({ error: "Erro ao buscar vistorias pendentes." });
  }
});

// GET - Imóveis do cliente pendentes de validação
router.get('/cliente/:idcliente/pendentes-validacao', async (req, res) => {
  const { idcliente } = req.params;

  try {
    const vistorias = await db`
      SELECT v.idvistoria, v.relatorio_url, v.status,
        i.idimovel, i.descricao, i.bloco, i.numero,
        e.nome AS nomeempreendimento, e.anexos AS imagemempreendimento
      FROM vistoria v
      JOIN imovel i ON v.idimovel = i.idimovel
      JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
      WHERE v.idcliente = ${Number(idcliente)}
        AND v.status = 'Aguardando Validação'
    `;

    res.status(200).json(vistorias);
  } catch (error) {
    console.error('Erro ao buscar vistorias pendentes de validação:', error);
    res.status(500).json({ error: 'Erro ao buscar vistorias pendentes.' });
  }
});



// PUT - Validar uma vistoria (altera status para "Vistoria Validada")
router.put('/validar/:idvistoria', async (req, res) => {
  const { idvistoria } = req.params;
  const idParsed = Number(idvistoria);

  if (isNaN(idParsed)) {
    return res.status(400).json({ error: 'ID de vistoria inválido.' });
  }

  try {
    // Verifica se a vistoria existe
    const [vistoria] = await db`
      SELECT idvistoria FROM vistoria WHERE idvistoria = ${idParsed}
    `;

    if (!vistoria) {
      return res.status(404).json({ error: 'Vistoria não encontrada.' });
    }

    // Atualiza apenas o status
    await db`
      UPDATE vistoria
      SET status = 'Vistoria Validada'
      WHERE idvistoria = ${idParsed}
    `;

    res.status(200).json({ mensagem: 'Vistoria validada com sucesso.' });
  } catch (error) {
    console.error('Erro ao validar vistoria:', error);
    res.status(500).json({ error: 'Erro ao validar vistoria.' });
  }
});


// GET: Vistorias do cliente com status 'Aguardando Validação'
router.get('/cliente/:idcliente/aguardando-validacao', async (req, res) => {
  const { idcliente } = req.params;

  try {
    const vistorias = await db`
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
      WHERE v.idcliente = ${idcliente} AND v.status = 'Aguardando Validação'
      ORDER BY v.idvistoria DESC
    `;

    res.json(vistorias);
  } catch (error) {
    console.error('Erro ao buscar vistorias aguardando validação:', error);
    res.status(500).json({ error: 'Erro ao buscar vistorias aguardando validação' });
  }
});

// PUT: Reagendar vistoria (cliente define nova data e hora, status muda para 'Vistoria Reagendada')
router.put('/reagendar/:idvistoria', async (req, res) => {
  const { idvistoria } = req.params;
  const { dataagendada, horaagendada } = req.body;

  const idParsed = Number(idvistoria);
  if (isNaN(idParsed)) {
    return res.status(400).json({ error: 'ID de vistoria inválido.' });
  }

  if (!dataagendada || !horaagendada) {
    return res.status(400).json({ error: 'Data e hora são obrigatórias.' });
  }

  try {
    const isoDatetimeStr = `${dataagendada}T${horaagendada}:00-03:00`;
    const dataFinal = new Date(isoDatetimeStr);

    if (isNaN(dataFinal.getTime())) {
      return res.status(400).json({ error: 'Data e hora inválidas.' });
    }

    const [vistoriaAtualizada] = await db`
      UPDATE vistoria
      SET dataagendada = ${dataFinal.toISOString()}, status = 'Vistoria Reagendada'
      WHERE idvistoria = ${idParsed} AND status IN ('Aguardando Validação', 'Vistoria Agendada')
      RETURNING *
    `;

    if (!vistoriaAtualizada) {
      return res.status(404).json({ error: 'Vistoria não encontrada ou status inválido para reagendamento.' });
    }

    res.status(200).json({ message: 'Vistoria reagendada com sucesso.' });
  } catch (error) {
    console.error('Erro ao reagendar vistoria:', error);
    res.status(500).json({ error: 'Erro ao reagendar vistoria.' });
  }
});

// PUT - Rejeitar vistoria (status = 'Vistoria Rejeitada', dataagendada = null, e salva datahorafim)
router.put('/rejeitar/:idvistoria', async (req, res) => {
  const { idvistoria } = req.params;
  const idParsed = Number(idvistoria);

  if (isNaN(idParsed)) {
    return res.status(400).json({ error: 'ID de vistoria inválido.' });
  }

  try {
    const now = new Date().toISOString();

    const [vistoriaAtualizada] = await db`
      UPDATE vistoria
      SET status = 'Vistoria Rejeitada',
          dataagendada = null,
          datahorafim = ${now}
      WHERE idvistoria = ${idParsed}
      RETURNING *
    `;

    if (!vistoriaAtualizada) {
      return res.status(404).json({ error: 'Vistoria não encontrada.' });
    }

    res.status(200).json({ message: 'Vistoria rejeitada com sucesso.' });
  } catch (error) {
    console.error('Erro ao rejeitar vistoria:', error);
    res.status(500).json({ error: 'Erro ao rejeitar vistoria.' });
  }
});

// PUT - Finalizar vistoria
router.put('/finalizar/:idvistoria', async (req, res) => {
  const { idvistoria } = req.params;
  const idParsed = Number(idvistoria);

  if (isNaN(idParsed)) {
    return res.status(400).json({ error: 'ID de vistoria inválido.' });
  }

  try {
    const now = new Date().toISOString(); // compatível com campo timestamptz

    const [atualizada] = await db`
      UPDATE vistoria
      SET status = 'Vistoria Finalizada',
          datahorafim = ${now}
      WHERE idvistoria = ${idParsed}
      RETURNING *
    `;

    if (!atualizada) {
      return res.status(404).json({ error: 'Vistoria não encontrada.' });
    }

    res.status(200).json({ message: 'Vistoria finalizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao finalizar vistoria:', error);
    res.status(500).json({ error: 'Erro ao finalizar vistoria.' });
  }
});



module.exports = router;
