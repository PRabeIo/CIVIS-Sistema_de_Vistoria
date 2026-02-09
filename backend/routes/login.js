const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const funcResult = await db`
      SELECT * FROM funcionario WHERE email = ${email} AND senha = ${senha}
    `;
    if (funcResult.length > 0) {
      const funcionario = funcResult[0];
      const adm = await db`
        SELECT * FROM administrador WHERE idadministrador = ${funcionario.id}
      `;
      if (adm.length > 0) {
        return res.json({ tipo: "admin", id: funcionario.id });
      }
      const vist = await db`
        SELECT * FROM vistoriador WHERE idvistoriador = ${funcionario.id}
      `;
      if (vist.length > 0) {
        return res.json({ tipo: "vistoriador", id: funcionario.id });
      }
      return res.status(401).json({ erro: "Cargo não reconhecido." });
    }

    const clienteResult = await db`
      SELECT * FROM cliente WHERE email = ${email} AND senha = ${senha}
    `;
    if (clienteResult.length > 0) {
      const cliente = clienteResult[0];
      return res.json({ tipo: "cliente", id: cliente.idcliente });
    }

    return res.status(401).json({ erro: "Email ou senha inválidos." });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

module.exports = router;
