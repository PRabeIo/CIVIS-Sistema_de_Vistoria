const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Cria a pasta de uploads se não existir
const uploadDir = path.join(__dirname, "..", "uploads", "funcionarios");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// lista todos os funcionários com cargo
router.get("/", async (req, res) => {
  try {
    const funcionarios = await db`
      SELECT 
        f.*, 
        CASE 
          WHEN v.idvistoriador IS NOT NULL THEN 'Vistoriador'
          WHEN a.idadministrador IS NOT NULL THEN 'Administrador'
          ELSE 'Desconhecido'
        END AS cargo
      FROM funcionario f
      LEFT JOIN vistoriador v ON f.id = v.idvistoriador
      LEFT JOIN administrador a ON f.id = a.idadministrador
      ORDER BY f.id DESC
    `;
    res.json(funcionarios);
  } catch (err) {
    console.error("Erro ao buscar funcionários:", err);
    res.status(500).json({ error: "Erro ao buscar funcionários." });
  }
});

// cadastra novo funcionário
router.post("/", async (req, res) => {
  const { cpf, email, nome, senha, telefone, cargo } = req.body;
  if (!cpf || !email || !nome || !senha || !cargo) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes." });
  }
  try {
    const [f] = await db`
      INSERT INTO funcionario (cpf, email, nome, senha, telefone)
      VALUES (${cpf}, ${email}, ${nome}, ${senha}, ${telefone})
      RETURNING *
    `;
    if (cargo === "Administrador") {
      await db`INSERT INTO administrador (idadministrador) VALUES (${f.id})`;
    } else if (cargo === "Vistoriador") {
      await db`INSERT INTO vistoriador (idvistoriador) VALUES (${f.id})`;
    }
    res.status(201).json({ ...f, cargo });
  } catch (err) {
    console.error("Erro ao cadastrar funcionário:", err);
    res.status(500).json({ error: "Erro ao cadastrar funcionário." });
  }
});

// atualiza funcionário
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { cpf, email, nome, senha, telefone } = req.body;
  try {
    const [f] = await db`
      UPDATE funcionario
      SET cpf = ${cpf}, email = ${email}, nome = ${nome}, senha = ${senha}, telefone = ${telefone}
      WHERE id = ${id}
      RETURNING *
    `;
    if (!f) return res.status(404).json({ error: "Funcionário não encontrado." });
    res.json(f);
  } catch (err) {
    console.error("Erro ao atualizar funcionário:", err);
    res.status(500).json({ error: "Erro ao atualizar funcionário." });
  }
});

// deleta funcionário
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { confirmacao } = req.body;
  if (confirmacao?.trim().toUpperCase() !== "SIM") {
    return res.status(400).json({ error: 'Digite "SIM" para confirmar a exclusão.' });
  }
  try {
    const result = await db`
      DELETE FROM funcionario WHERE id = ${id} RETURNING *
    `;
    if (result.length === 0) return res.status(404).json({ error: "Funcionário não encontrado." });
    res.json({ message: "Funcionário deletado com sucesso." });
  } catch (err) {
    console.error("Erro ao excluir funcionário:", err);
    res.status(500).json({ error: "Erro ao excluir funcionário." });
  }
});

// busca por ID
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });
  try {
    const [f] = await db`
      SELECT 
        f.*, 
        CASE 
          WHEN v.idvistoriador IS NOT NULL THEN 'Vistoriador'
          WHEN a.idadministrador IS NOT NULL THEN 'Administrador'
          ELSE 'Desconhecido'
        END AS cargo
      FROM funcionario f
      LEFT JOIN vistoriador v ON f.id = v.idvistoriador
      LEFT JOIN administrador a ON f.id = a.idadministrador
      WHERE f.id = ${id}
    `;
    if (!f) return res.status(404).json({ error: "Funcionário não encontrado." });
    res.json(f);
  } catch (err) {
    console.error("Erro ao buscar funcionário por ID:", err);
    res.status(500).json({ error: "Erro ao buscar funcionário." });
  }
});

//GET: busca perfil do funcionário
router.get("/perfil/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });
  try {
    const [f] = await db`
      SELECT 
        f.id, f.nome, f.cpf, f.email, f.telefone, f.imagemdeperfil,
        CASE 
          WHEN v.idvistoriador IS NOT NULL THEN 'Vistoriador'
          WHEN a.idadministrador IS NOT NULL THEN 'Administrador'
          ELSE 'Funcionário'
        END AS cargo
      FROM funcionario f
      LEFT JOIN vistoriador v ON v.idvistoriador = f.id
      LEFT JOIN administrador a ON a.idadministrador = f.id
      WHERE f.id = ${id}
    `;
    if (!f) return res.status(404).json({ error: "Funcionário não encontrado." });
    res.json(f);
  } catch (err) {
    console.error("Erro ao buscar perfil:", err);
    res.status(500).json({ error: "Erro ao buscar perfil." });
  }
});

//GET: busca perfil do funcionário com cargo
router.get("/perfil-completo/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });
  try {
    const [f] = await db`
      SELECT 
        f.id, f.nome, f.cpf, f.email, f.telefone, f.imagemdeperfil,
        CASE 
          WHEN v.idvistoriador IS NOT NULL THEN 'Vistoriador'
          WHEN a.idadministrador IS NOT NULL THEN 'Administrador'
          ELSE 'Funcionário'
        END AS cargo
      FROM funcionario f
      LEFT JOIN vistoriador v ON f.id = v.idvistoriador
      LEFT JOIN administrador a ON f.id = a.idadministrador
      WHERE f.id = ${id}
    `;
    if (!f) return res.status(404).json({ error: "Funcionário não encontrado." });
    res.json(f);
  } catch (err) {
    console.error("Erro ao buscar perfil do funcionário:", err);
    res.status(500).json({ error: "Erro ao buscar perfil do funcionário." });
  }
});

// 🔽 POST: cadastra novo funcionário (nao usado ainda)
router.post("/", upload.single("imagemdeperfil"), async (req, res) => {
  const { cpf, email, nome, senha, telefone, cargo } = req.body;
  const imagemDePerfil = req.file ? req.file.filename : null;

  if (!cpf || !email || !nome || !senha || !cargo) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes." });
  }

  try {
    const [f] = await db`
      INSERT INTO funcionario (cpf, email, nome, senha, telefone, imagemdeperfil)
      VALUES (${cpf}, ${email}, ${nome}, ${senha}, ${telefone}, ${imagemDePerfil})
      RETURNING *
    `;

    if (cargo === "Administrador") {
      await db`INSERT INTO administrador (idadministrador) VALUES (${f.id})`;
    } else if (cargo === "Vistoriador") {
      await db`INSERT INTO vistoriador (idvistoriador) VALUES (${f.id})`;
    }

    res.status(201).json({ ...f, cargo });
  } catch (err) {
    console.error("Erro ao cadastrar funcionário:", err);
    res.status(500).json({ error: "Erro ao cadastrar funcionário." });
  }
});

// PUT: atualiza funcionário COM imagem (rota separada para editar perfil funcionario)
router.put("/:id/atualizar-com-imagem", upload.single("imagemdeperfil"), async (req, res) => {
  const { id } = req.params;
  const { cpf, email, nome, senha, telefone } = req.body;
  const imagemDePerfil = req.file ? req.file.filename : null;

  try {
    const [fExistente] = await db`
      SELECT * FROM funcionario WHERE id = ${id}
    `;
    if (!fExistente) {
      return res.status(404).json({ error: "Funcionário não encontrado." });
    }

    const [f] = await db`
      UPDATE funcionario SET
        cpf = ${cpf ?? fExistente.cpf},
        email = ${email ?? fExistente.email},
        nome = ${nome ?? fExistente.nome},
        senha = ${senha ?? fExistente.senha},
        telefone = ${telefone ?? fExistente.telefone},
        imagemdeperfil = ${imagemDePerfil ?? fExistente.imagemdeperfil}
      WHERE id = ${id}
      RETURNING *
    `;

    res.json(f);
  } catch (err) {
    console.error("Erro ao atualizar funcionário com imagem:", err);
    res.status(500).json({ error: "Erro ao atualizar funcionário com imagem." });
  }
});

module.exports = router;
