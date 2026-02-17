const relatorioService = require("../services/relatorio.service");

async function gerarRelatorio(req, res) {
  try {
    const { idVistoria } = req.body;
    const comodos = JSON.parse(req.body.comodos || "{}");

    const idVistoriadorToken = Number(req.usuario?.sub);

    const resultado = await relatorioService.gerar({
      idVistoria,
      comodos,
      arquivos: req.files || [],
      idVistoriadorToken,
    });

    return res.status(200).json(resultado);

  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    return res.status(err.statusCode || 500).json({
      erro: err.message || "Erro ao gerar relatório",
    });
  }
}

module.exports = { gerarRelatorio };
