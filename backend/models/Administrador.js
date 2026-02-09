const express = require('express');
const router = express.Router();
const db = require('../db');  // Conexão usando postgres.js

// GET: Listar todos os administradores
router.get('/', async (req, res) => {
  try {
    const administradores = await db`
      SELECT * FROM administrador
    `;
    res.status(200).json(administradores);
  } catch (err) {
    console.error('Erro ao listar administradores:', err);
    res.status(500).json({ error: 'Erro ao listar administradores.' });
  }
});

// POST: Criar novo administrador
router.post('/', async (req, res) => {
  const { cpf, email, nome, senha, telefone } = req.body;

  if (!cpf || !email || !nome || !senha || !telefone) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // 1. Inserir como funcionário
    const [novoFuncionario] = await db`
      INSERT INTO funcionario (cpf, email, nome, senha, telefone)
      VALUES (${cpf}, ${email}, ${nome}, ${senha}, ${telefone})
      RETURNING id
    `;

    const funcionarioId = novoFuncionario.id;

    // 2. Inserir como administrador, vinculando via idadministrador
    const [administrador] = await db`
      INSERT INTO administrador (idadministrador)
      VALUES (${funcionarioId})
      RETURNING *
    `;

    res.status(201).json({
      message: 'Administrador cadastrado com sucesso.',
      administrador,
    });
  } catch (err) {
    console.error('Erro ao cadastrar administrador:', err.message);
    res.status(500).json({ error: 'Erro ao cadastrar administrador.' });
  }
});

// PUT: Atualizar dados do administrador (funcionário vinculado)
router.put('/:idadministrador', async (req, res) => {
  const { idadministrador } = req.params;
  const { cpf, email, nome, senha, telefone } = req.body;

  try {
    // Atualizar direto na tabela funcionario, pois idadministrador === funcionario.id
    const [funcionarioAtualizado] = await db`
      UPDATE funcionario
      SET cpf = ${cpf}, email = ${email}, nome = ${nome}, senha = ${senha}, telefone = ${telefone}
      WHERE id = ${idadministrador}
      RETURNING *
    `;

    if (!funcionarioAtualizado) {
      return res.status(404).json({ error: 'Administrador não encontrado.' });
    }

    res.json(funcionarioAtualizado);
  } catch (err) {
    console.error('Erro ao atualizar administrador:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar administrador.' });
  }
});

// DELETE: Remover administrador e o funcionário vinculado
router.delete('/:idadministrador', async (req, res) => {
  const { idadministrador } = req.params;

  try {
    // 1. Remover da tabela administrador
    const resultAdmin = await db`
      DELETE FROM administrador
      WHERE idadministrador = ${idadministrador}
      RETURNING *
    `;

    if (resultAdmin.length === 0) {
      return res.status(404).json({ error: 'Administrador não encontrado.' });
    }

    // 2. Remover da tabela funcionario
    await db`
      DELETE FROM funcionario
      WHERE id = ${idadministrador}
    `;

    res.json({ message: 'Administrador e funcionário removidos com sucesso.' });
  } catch (err) {
    console.error('Erro ao deletar administrador:', err.message);
    res.status(500).json({ error: 'Erro ao deletar administrador.' });
  }
});

module.exports = router;




