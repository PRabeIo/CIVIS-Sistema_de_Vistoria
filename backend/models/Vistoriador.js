const express = require('express');
const router = express.Router();
const db = require('../db');

// GET: Listar todos os vistoriadores com nome e cpf (dados do funcionario)
router.get('/', async (req, res) => {
  try {
    const vistoriadores = await db`
      SELECT 
        v.idvistoriador,
        f.nome,
        f.cpf
      FROM vistoriador v
      JOIN funcionario f ON v.idvistoriador = f.id
    `;
    res.status(200).json(vistoriadores);
  } catch (err) {
    console.error('Erro ao listar vistoriadores:', err);
    res.status(500).json({ error: 'Erro ao listar vistoriadores.' });
  }
});

// GET: Buscar vistoriador por ID
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  try {
    const [vistoriador] = await db`
      SELECT 
        v.idvistoriador,
        f.nome,
        f.cpf,
        f.email,
        f.telefone
      FROM vistoriador v
      JOIN funcionario f ON v.idvistoriador = f.id
      WHERE v.idvistoriador = ${id}
    `;

    if (!vistoriador) {
      return res.status(404).json({ error: 'Vistoriador não encontrado.' });
    }

    res.status(200).json(vistoriador);
  } catch (err) {
    console.error('Erro ao buscar vistoriador:', err);
    res.status(500).json({ error: 'Erro ao buscar vistoriador.' });
  }
});

// POST: Cadastrar novo funcionário e automaticamente torná-lo um vistoriador
router.post('/', async (req, res) => {
  const { nome, cpf, email, senha, telefone } = req.body;

  if (!nome || !cpf || !email || !senha) {
    return res.status(400).json({ error: 'Nome, CPF, e-mail e senha são obrigatórios.' });
  }

  try {
    // Verifica se CPF ou e-mail já existem
    const [cpfExistente] = await db`SELECT * FROM funcionario WHERE cpf = ${cpf}`;
    const [emailExistente] = await db`SELECT * FROM funcionario WHERE email = ${email}`;

    if (cpfExistente || emailExistente) {
      return res.status(400).json({ error: 'CPF ou e-mail já estão cadastrados.' });
    }

    // Cadastra o funcionário
    const [novoFuncionario] = await db`
      INSERT INTO funcionario (nome, cpf, email, senha, telefone)
      VALUES (${nome}, ${cpf}, ${email}, ${senha}, ${telefone || null})
      RETURNING id, nome, cpf, email
    `;

    // Cadastra o funcionário como vistoriador
    const [novoVistoriador] = await db`
      INSERT INTO vistoriador (idvistoriador)
      VALUES (${novoFuncionario.id})
      RETURNING idvistoriador
    `;

    res.status(201).json({
      message: 'Funcionário e vistoriador criados com sucesso.',
      funcionario: novoFuncionario,
      vistoriador: novoVistoriador
    });
  } catch (err) {
    console.error('Erro ao cadastrar funcionário e vistoriador:', err);
    res.status(500).json({ error: 'Erro ao cadastrar funcionário e vistoriador.' });
  }
});

// PUT: Atualizar dados do vistoriador (funcionário vinculado)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const idNum = Number(id);
  const { nome, cpf, email, senha, telefone } = req.body;

  if (isNaN(idNum)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  try {
    // Verifica se o funcionário (vistoriador) existe
    const [funcionarioExistente] = await db`
      SELECT * FROM funcionario WHERE id = ${idNum}
    `;
    if (!funcionarioExistente) {
      return res.status(404).json({ error: 'Vistoriador (funcionário) não encontrado.' });
    }

    await db`
      UPDATE funcionario SET
        nome = ${nome ?? funcionarioExistente.nome},
        cpf = ${cpf ?? funcionarioExistente.cpf},
        email = ${email ?? funcionarioExistente.email},
        senha = ${senha ?? funcionarioExistente.senha},
        telefone = ${telefone ?? funcionarioExistente.telefone}
      WHERE id = ${idNum}
    `;

    res.status(200).json({ message: 'Vistoriador atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar vistoriador:', err);
    res.status(500).json({ error: 'Erro ao atualizar vistoriador.' });
  }
});

// DELETE: Excluir vistoriador por ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db`
      DELETE FROM vistoriador WHERE idvistoriador = ${Number(id)}
    `;
    res.status(200).json({ message: 'Vistoriador excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir vistoriador:', err);
    res.status(500).json({ error: 'Erro ao excluir vistoriador.' });
  }
});

module.exports = router;
