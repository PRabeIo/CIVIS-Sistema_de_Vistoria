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

// Configuração do Multer para upload de imagens
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

// POST - Cadastrar imóvel
router.post('/', async (req, res) => {
  const { descricao, bloco, numero, idcliente, idempreendimento } = req.body;

  if (!descricao || !numero || !idcliente || !idempreendimento) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  try {
    const idClienteNum = Number(idcliente);
    const idEmpreendimentoNum = Number(idempreendimento);

    if (isNaN(idClienteNum) || isNaN(idEmpreendimentoNum)) {
      return res.status(400).json({ error: 'IDs inválidos.' });
    }

    const [novoImovel] = await db`
      INSERT INTO imovel (
        descricao, bloco, numero, idcliente, idempreendimento, vistoriasrealizadas
      )
      VALUES (
        ${descricao}, ${bloco}, ${numero}, ${idClienteNum}, ${idEmpreendimentoNum}, 0
      )
      RETURNING *
    `;

    res.status(201).json(novoImovel);
  } catch (error) {
    console.error('Erro ao cadastrar imóvel:', error);
    res.status(500).json({ error: 'Erro ao cadastrar imóvel.' });
  }
});

// GET - Buscar imóveis por empreendimento que ainda não têm vistoria
router.get('/', async (req, res) => {
  const { empreendimentoid } = req.query;

  if (!empreendimentoid) {
    return res.status(400).json({ error: 'Parâmetro empreendimentoid é obrigatório.' });
  }

  try {
    const imoveis = await db`
      SELECT *
      FROM imovel i
      WHERE i.idempreendimento = ${Number(empreendimentoid)}
        AND NOT EXISTS (
          SELECT 1 FROM vistoria v
          WHERE v.idimovel = i.idimovel
        )
    `;
    res.status(200).json(imoveis);
  } catch (error) {
    console.error('Erro ao buscar imóveis sem vistoria:', error);
    res.status(500).json({ error: 'Erro ao buscar imóveis.' });
  }
});


// GET - Buscar todos os imóveis com dados adicionais
router.get('/todos', async (req, res) => {
  try {
    const imoveis = await db`
      SELECT 
        i.idimovel, i.descricao, i.bloco, i.numero,
        e.nome AS nomeempreendimento,
        v.dataagendada,
        v.idvistoria, v.status,
        e.anexos
      FROM imovel i
      LEFT JOIN (
        SELECT DISTINCT ON (idimovel) *
        FROM vistoria
        ORDER BY idimovel, dataagendada DESC
      ) v ON i.idimovel = v.idimovel
      LEFT JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    `;

    res.status(200).json(imoveis);
  } catch (error) {
    console.error('Erro ao buscar imóveis:', error);
    res.status(500).json({ error: 'Erro ao buscar imóveis.' });
  }
});



// GET - Buscar todas as vistorias dos imóveis de um cliente
router.get('/cliente/:idcliente', async (req, res) => {
  const { idcliente } = req.params;

  try {
    const vistorias = await db`
      SELECT 
        v.idvistoria, v.status, v.dataagendada, v.datahorafim,
        i.idimovel, i.descricao, i.bloco, i.numero,
        e.nome AS nomeempreendimento, e.anexos
      FROM vistoria v
      JOIN imovel i ON v.idimovel = i.idimovel
      LEFT JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
      WHERE v.idcliente = ${Number(idcliente)}
      ORDER BY v.dataagendada DESC NULLS LAST
    `;

    res.status(200).json(vistorias);
  } catch (error) {
    console.error('Erro ao buscar vistorias do cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar vistorias do cliente.' });
  }
});


// PUT - Atualizar imóvel
router.put('/:idimovel', async (req, res) => {
  const { idimovel } = req.params;
  const { descricao, bloco, numero, idempreendimento, vistoriasrealizadas } = req.body;

  try {
    const idImovelNum = Number(idimovel);
    if (isNaN(idImovelNum)) {
      return res.status(400).json({ error: 'ID do imóvel inválido.' });
    }

    const [imovelExistente] = await db`
      SELECT * FROM imovel WHERE idimovel = ${idImovelNum}
    `;
    if (!imovelExistente) {
      return res.status(404).json({ error: 'Imóvel não encontrado.' });
    }

    const novoDescricao = descricao ?? imovelExistente.descricao;
    const novoBloco = bloco ?? imovelExistente.bloco;
    const novoNumero = numero ?? imovelExistente.numero;
    const novoEmpreendimento = idempreendimento ? Number(idempreendimento) : null;
    const novasVistorias = vistoriasrealizadas ?? imovelExistente.vistoriasrealizadas;

    await db`
      UPDATE imovel SET
        descricao = ${novoDescricao},
        bloco = ${novoBloco},
        numero = ${novoNumero},
        idempreendimento = ${novoEmpreendimento},
        vistoriasrealizadas = ${novasVistorias}
      WHERE idimovel = ${idImovelNum}
    `;
    res.status(200).json({ message: 'Imóvel atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar imóvel:', error);
    res.status(500).json({ error: 'Erro ao atualizar imóvel.' });
  }
});


// GET - Imóveis disponíveis para agendamento
router.get('/cliente/:idcliente/disponiveis', async (req, res) => {
  const { idcliente } = req.params;

  try {
    const imoveis = await db`
      SELECT DISTINCT 
        v.idvistoria,
        i.idimovel, 
        i.descricao, 
        i.bloco, 
        i.numero,
        e.nome AS nomeempreendimento, 
        e.anexos AS imagemempreendimento
      FROM imovel i
      JOIN vistoria v ON i.idimovel = v.idimovel
      JOIN cliente c ON v.idcliente = c.idcliente
      LEFT JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
      WHERE c.idcliente = ${Number(idcliente)} AND v.status = 'Aguardando Agendamento da Vistoria'
    `;
    res.status(200).json(imoveis);
  } catch (error) {
    console.error('Erro ao buscar imóveis disponíveis:', error);
    res.status(500).json({ error: 'Erro ao buscar imóveis disponíveis.' });
  }
});




module.exports = router;
