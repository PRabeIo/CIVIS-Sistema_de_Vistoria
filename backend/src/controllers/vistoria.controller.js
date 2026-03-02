const vistoriaService = require('../services/vistoria.service');

async function listar(req, res) {
  try {
    const vistorias = await vistoriaService.listarTodas();
    return res.status(200).json(vistorias);
  } catch (err) {
    console.error('Erro ao listar vistorias:', err);
    return res.status(500).json({ error: 'Erro ao listar vistorias.' });
  }
}

async function buscarPorId(req, res) {
  try {
    const vistoria = await vistoriaService.buscarPorIdComAcesso(
      req.params.idvistoria,
      req.usuario
    );

    if (!vistoria) {
      return res.status(404).json({ error: 'Vistoria não encontrada ou sem permissão.' });
    }

    return res.status(200).json(vistoria);
  } catch (err) {
    console.error('Erro ao buscar vistoria:', err);
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Erro ao buscar vistoria.'
    });
  }
}


/**
 * CLIENTE - listas /me
 */
async function minhas(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const vistorias = await vistoriaService.listarMinhas(idcliente);
    return res.status(200).json(vistorias);
  } catch (err) {
    console.error('Erro ao listar minhas vistorias:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao listar vistorias.' });
  }
}

async function pendentesAgendamentoMe(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const v = await vistoriaService.pendentesAgendamentoCliente(idcliente);
    return res.status(200).json(v);
  } catch (err) {
    console.error('Erro ao buscar pendentes agendamento:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar vistorias.' });
  }
}

async function pendentesValidacaoMe(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const v = await vistoriaService.pendentesValidacaoCliente(idcliente);
    return res.status(200).json(v);
  } catch (err) {
    console.error('Erro ao buscar pendentes validação:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar vistorias.' });
  }
}

async function aguardandoValidacaoMe(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const v = await vistoriaService.aguardandoValidacaoCliente(idcliente);
    return res.status(200).json(v);
  } catch (err) {
    console.error('Erro ao buscar aguardando validação:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar vistorias.' });
  }
}

/**
 * Ações do cliente
 */
async function agendar(req, res) {
  try {
    const idcliente = req.usuario.sub;

    const vistoriaAtualizada = await vistoriaService.agendar(
      req.params.idvistoria,
      idcliente,
      req.body
    );

    if (!vistoriaAtualizada) {
      return res.status(404).json({ error: 'Vistoria não encontrada ou status inválido para agendar.' });
    }

    return res.status(200).json(vistoriaAtualizada);
  } catch (err) {
    console.error('Erro ao agendar vistoria:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao agendar vistoria.' });
  }
}

async function validar(req, res) {
  try {
    const idcliente = req.usuario.sub;

    const ok = await vistoriaService.validar(req.params.idvistoria, idcliente);

    if (!ok) return res.status(404).json({ error: 'Vistoria não encontrada ou status inválido para validar.' });

    return res.status(200).json({ message: 'Vistoria validada com sucesso.' });
  } catch (err) {
    console.error('Erro ao validar vistoria:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao validar vistoria.' });
  }
}

async function reagendar(req, res) {
  try {
    const idcliente = req.usuario.sub;

    const vistoriaAtualizada = await vistoriaService.reagendar(
      req.params.idvistoria,
      idcliente,
      req.body
    );

    if (!vistoriaAtualizada) {
      return res.status(404).json({ error: 'Vistoria não encontrada ou status inválido para reagendamento.' });
    }

    return res.status(200).json(vistoriaAtualizada);
  } catch (err) {
    console.error('Erro ao reagendar vistoria:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao reagendar vistoria.' });
  }
}

async function rejeitar(req, res) {
  try {
    const idcliente = req.usuario.sub;

    const vistoriaAtualizada = await vistoriaService.rejeitar(req.params.idvistoria, idcliente);

    if (!vistoriaAtualizada) {
      return res.status(404).json({ error: 'Vistoria não encontrada ou status inválido para rejeitar.' });
    }

    return res.status(200).json(vistoriaAtualizada);
  } catch (err) {
    console.error('Erro ao rejeitar vistoria:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao rejeitar vistoria.' });
  }
}

/**
 * VISTORIADOR
 */
async function minhasVistoriador(req, res) {
  try {
    const idvistoriador = req.usuario.sub;
    const v = await vistoriaService.listarMinhasVistoriador(idvistoriador);
    return res.status(200).json(v);
  } catch (err) {
    console.error('Erro ao listar vistorias do vistoriador:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao listar vistorias.' });
  }
}

async function iniciar(req, res) {
  try {
    const idvistoriador = req.usuario.sub;

    const vistoria = await vistoriaService.iniciar(req.params.idvistoria, idvistoriador);

    if (!vistoria) {
      return res.status(404).json({ error: 'Vistoria não encontrada ou indisponível para iniciar.' });
    }

    return res.status(200).json(vistoria);
  } catch (err) {
    console.error('Erro ao iniciar vistoria:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao iniciar a vistoria.' });
  }
}

async function finalizar(req, res) {
  try {
    const idvistoriador = req.usuario.sub;

    const atualizada = await vistoriaService.finalizar(req.params.idvistoria, idvistoriador);

    if (!atualizada) {
      return res.status(404).json({ error: 'Vistoria não encontrada, status inválido ou você não tem permissão.' });
    }

    return res.status(200).json(atualizada);
  } catch (err) {
    console.error('Erro ao finalizar vistoria:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao finalizar vistoria.' });
  }
}

/**
 * LEGADO (mantido)
 */
async function pendentesAgendamentoCliente(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const vistorias = await vistoriaService.pendentesAgendamentoCliente(idcliente);
    return res.status(200).json(vistorias);
  } catch (err) {
    console.error('Erro ao buscar vistorias pendentes:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar vistorias pendentes.' });
  }
}

async function pendentesValidacaoCliente(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const vistorias = await vistoriaService.pendentesValidacaoCliente(idcliente);
    return res.status(200).json(vistorias);
  } catch (err) {
    console.error('Erro ao buscar vistorias pendentes de validação:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar vistorias pendentes.' });
  }
}

async function aguardandoValidacaoCliente(req, res) {
  try {
    const idcliente = req.usuario.sub;
    const vistorias = await vistoriaService.aguardandoValidacaoCliente(idcliente);
    return res.status(200).json(vistorias);
  } catch (err) {
    console.error('Erro ao buscar vistorias aguardando validação:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar vistorias aguardando validação' });
  }
}

async function atualizar(req, res) {
  try {
    const ok = await vistoriaService.atualizar(req.params.idvistoria, req.body);

    if (!ok) return res.status(404).json({ error: 'Vistoria não encontrada.' });

    return res.status(200).json({ message: 'Vistoria atualizada com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar vistoria:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao atualizar vistoria.' });
  }
}

async function deletar(req, res) {
  try {
    const ok = await vistoriaService.deletar(req.params.idvistoria);

    if (!ok) return res.status(404).json({ error: 'Vistoria não encontrada.' });

    return res.status(200).json({ message: 'Vistoria excluída com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir vistoria:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao excluir vistoria.' });
  }
}

async function disponiveisVistoriador(req, res) {
  try {
    const lista = await vistoriaService.listarDisponiveisVistoriador();
    return res.json(lista);
  } catch (err) {
    console.error("Erro ao listar vistorias disponíveis:", err);
    return res.status(500).json({ error: "Erro ao listar vistorias disponíveis." });
  }
}

module.exports = {
  listar,
  buscarPorId,

  // cliente /me
  minhas,
  pendentesAgendamentoMe,
  pendentesValidacaoMe,
  aguardandoValidacaoMe,

  // ações cliente
  agendar,
  reagendar,
  rejeitar,
  validar,

  // vistoriador
  disponiveisVistoriador,
  minhasVistoriador,
  iniciar,
  finalizar,

  // legado
  pendentesAgendamentoCliente,
  pendentesValidacaoCliente,
  aguardandoValidacaoCliente,

  // admin
  atualizar,
  deletar,
};
