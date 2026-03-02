function apenasAdmin(req, res, next) {
  if (!req.usuario || req.usuario.cargo !== 'Administrador') {
    return res.status(403).json({ erro: 'Acesso permitido apenas para administradores.' });
  }
  next();
}

function apenasVistoriador(req, res, next) {
  if (!req.usuario || req.usuario.cargo !== 'Vistoriador') {
    return res.status(403).json({ erro: 'Acesso permitido apenas para vistoriadores.' });
  }
  next();
}

function apenasFuncionario(req, res, next) {
  if (!req.usuario) {
    return res.status(403).json({ erro: 'Não autenticado.' });
  }

  const cargo = req.usuario.cargo;

  if (cargo !== 'Administrador' && cargo !== 'Vistoriador') {
    return res.status(403).json({ erro: 'Acesso permitido apenas para funcionários.' });
  }

  next();
}


function apenasCliente(req, res, next) {
  if (!req.usuario || req.usuario.tipo !== 'cliente') {
    return res.status(403).json({ erro: 'Acesso permitido apenas para clientes.' });
  }
  next();
}

module.exports = {
  apenasAdmin,
  apenasVistoriador,
  apenasCliente,
  apenasFuncionario,
};
