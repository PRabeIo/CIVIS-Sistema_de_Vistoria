const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Garante que a pasta de uploads exista
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

/* ========== CRUD BÁSICO ========== */

// POST: Criar novo empreendimento
router.post('/', upload.single('anexos'), async (req, res) => {

  const {
    nome,
    construtora,
    estado,
    cidade,
    cep,
    rua
  } = req.body;

  const arquivoAnexo = req.file ? req.file.filename : null;

  try {
    const [empreendimento] = await db`
      INSERT INTO empreendimento
        (nome, construtora, estado, cidade, cep, rua, anexos)
      VALUES
        (${nome}, ${construtora}, ${estado}, ${cidade}, ${cep}, ${rua}, ${arquivoAnexo})
      RETURNING *
    `;
    res.status(201).json(empreendimento);
  } catch (err) {
    console.error('❌ Erro ao criar empreendimento:', err);
    res.status(500).json({ error: 'Erro ao criar empreendimento.', detalhes: err.message });
  }
});


// GET: Listar todos os empreendimentos
router.get('/', async (req, res) => {
  try {
    const empreendimentos = await db`
      SELECT * FROM empreendimento ORDER BY idempreendimento DESC
    `;
    res.status(200).json(empreendimentos);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar empreendimentos.', detalhes: err.message });
  }
});

// GET: Buscar um empreendimento por ID
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  try {
    const [empreendimento] = await db`
      SELECT * FROM empreendimento WHERE idempreendimento = ${id}
    `;
    if (!empreendimento) {
      return res.status(404).json({ error: 'Empreendimento não encontrado.' });
    }

    res.status(200).json(empreendimento);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar empreendimento.', detalhes: error.message });
  }
});

// GET: Imóveis de um empreendimento específico
router.get('/:id/imoveis', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  try {
    const imoveis = await db`
      SELECT * FROM imovel WHERE idempreendimento = ${id}
    `;
    res.status(200).json(imoveis);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar imóveis do empreendimento.', detalhes: error.message });
  }
});

// PUT: Atualizar empreendimento
router.put('/:id', upload.single('anexos'), async (req, res) => {
  const id = Number(req.params.id);
  const {
    nome,
    construtora,
    estado,
    cidade,
    cep,
    rua
  } = req.body;
  const arquivoAnexo = req.file ? req.file.filename : null;

  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  try {
    const [empreendimentoExistente] = await db`
      SELECT * FROM empreendimento WHERE idempreendimento = ${id}
    `;
    if (!empreendimentoExistente) {
      return res.status(404).json({ error: 'Empreendimento não encontrado.' });
    }

    await db`
      UPDATE empreendimento SET
        nome = ${nome ?? empreendimentoExistente.nome},
        construtora = ${construtora ?? empreendimentoExistente.construtora},
        estado = ${estado ?? empreendimentoExistente.estado},
        cidade = ${cidade ?? empreendimentoExistente.cidade},
        cep = ${cep ?? empreendimentoExistente.cep},
        rua = ${rua ?? empreendimentoExistente.rua},
        anexos = ${arquivoAnexo ?? empreendimentoExistente.anexos}
      WHERE idempreendimento = ${id}
    `;

    res.status(200).json({ message: 'Empreendimento atualizado com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar empreendimento.', detalhes: err.message });
  }
});

// DELETE: Excluir empreendimento
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

  try {
    const result = await db`
      DELETE FROM empreendimento WHERE idempreendimento = ${id}
    `;
    if (result.count === 0) {
      return res.status(404).json({ error: 'Empreendimento não encontrado para exclusão.' });
    }

    res.status(200).json({ message: 'Empreendimento excluído com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir empreendimento.', detalhes: err.message });
  }
});

module.exports = router;

