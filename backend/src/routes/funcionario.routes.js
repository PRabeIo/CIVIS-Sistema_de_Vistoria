const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const funcionarioController = require("../controllers/funcionario.controller");
const { apenasAdmin, apenasFuncionario } = require("../middlewares/role.middleware");

// uploads/funcionarios
const uploadDir = path.join(__dirname, "..", "..", "uploads", "funcionarios");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `funcionario_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

/* =========================
   ROTAS DO FUNCIONÁRIO LOGADO (/me)
   (mesmo padrão do Cliente)
========================= */
router.get("/me", apenasFuncionario, funcionarioController.me);

router.patch("/me", apenasFuncionario, funcionarioController.atualizarMe);

router.put("/me/avatar", apenasFuncionario, upload.single("imagemdeperfil"), funcionarioController.atualizarMeuAvatar);

router.put("/me/senha", apenasFuncionario, funcionarioController.atualizarMinhaSenha);

/* =========================
   ROTAS ADMINISTRATIVAS

========================= */
router.get("/", apenasAdmin, funcionarioController.listar);

router.post("/", apenasAdmin, funcionarioController.criar);

// (opcional) manter perfil por id só pra admin ver

router.get("/perfil/:id", apenasAdmin, funcionarioController.perfil);

router.get("/:id", apenasAdmin, funcionarioController.buscarPorId);

router.put("/:id", apenasAdmin, upload.single("imagemdeperfil"), funcionarioController.atualizar);

router.delete("/:id", apenasAdmin, funcionarioController.deletar);

module.exports = router;