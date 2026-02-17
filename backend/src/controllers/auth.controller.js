const authService = require('../services/auth.service');

async function login(req, res) {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
  }

  try {
    const result = await authService.autenticar(email, senha);

    if (result.erro) {
      return res.status(result.status || 401).json({ erro: result.erro });
    }

    // agora retorna token + usuario
    return res.status(200).json({
      token: result.token,
      usuario: result.usuario
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { login };
