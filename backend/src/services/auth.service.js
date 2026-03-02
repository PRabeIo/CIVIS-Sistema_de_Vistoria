const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function autenticar(email, senha) {
  // 1) tenta funcionario
  const [funcionario] = await db`
    SELECT id, email, senha, nome
    FROM funcionario
    WHERE email = ${email}
    LIMIT 1
  `;

  if (funcionario) {
    const senhaOk = await bcrypt.compare(senha, funcionario.senha);
    if (!senhaOk) {
      return { erro: 'Email ou senha inválidos.', status: 401 };
    }

    // checa cargo (exclusivo)
    const [adm] = await db`
      SELECT 1
      FROM administrador
      WHERE idadministrador = ${funcionario.id}
      LIMIT 1
    `;
    const [vist] = await db`
      SELECT 1
      FROM vistoriador
      WHERE idvistoriador = ${funcionario.id}
      LIMIT 1
    `;

    let tipoSistema = null;
    let cargo = null;

    if (adm) {
      tipoSistema = 'admin';
      cargo = 'Administrador';
    }
    else if (vist) {
      tipoSistema = 'vistoriador';
      cargo = 'Vistoriador';
    }
    else {
      return { erro: 'Cargo não reconhecido.', status: 401 };
    }

    const token = jwt.sign(
      { sub: funcionario.id, tipo: tipoSistema, cargo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
      token,
      usuario: {
        id: funcionario.id,
        tipo: tipoSistema,   // 🔥 AQUI A CHAVE
        cargo,
        nome: funcionario.nome,
        email: funcionario.email,
      }
    };
  }

  // 2) tenta cliente
  const [cliente] = await db`
    SELECT idcliente, email, senha, nome
    FROM cliente
    WHERE email = ${email}
    LIMIT 1
  `;

  if (cliente) {
    const senhaOk = await bcrypt.compare(senha, cliente.senha);
    if (!senhaOk) {
      return { erro: 'Email ou senha inválidos.', status: 401 };
    }

    const token = jwt.sign(
      { sub: cliente.idcliente, tipo: 'cliente', cargo: 'Cliente' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
      token,
      usuario: {
        id: cliente.idcliente,
        tipo: 'cliente',
        cargo: 'Cliente',
        nome: cliente.nome,
        email: cliente.email,
      }
    };
  }

  return { erro: 'Email ou senha inválidos.', status: 401 };
}

module.exports = { autenticar };
