const fs = require("fs");

function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // não estoura erro por falha de limpeza
    console.warn("[safeUnlink] Falha ao remover arquivo:", filePath, err.message);
  }
}

module.exports = { safeUnlink };