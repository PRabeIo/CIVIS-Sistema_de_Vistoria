const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const db = require("../db");
const fetch = require("node-fetch");
require("dotenv").config();

/* -------- GERADOR DE TEXTO -------- */
function gerarTextoRelatorio(comodos) {
  let texto = "";

  for (const [nomeComodo, dados] of Object.entries(comodos)) {
    if (!dados || dados === "0" || dados === "N/A") continue;

    texto += `\nCÔMODO: ${nomeComodo.toUpperCase()}\n`;

    for (const [item, valor] of Object.entries(dados)) {
      if (!valor || valor === "0" || valor === "N/A") continue;
      texto += `• ${item}: ${valor}.\n`;
    }

    texto += "\n";
  }

  texto += `
CONCLUSÃO TÉCNICA:

Com base nas observações realizadas durante a vistoria, o imóvel apresenta as condições descritas acima para cada cômodo analisado.
Recomenda-se a correção dos pontos observados para garantir a integridade estrutural, funcional e estética do imóvel.

Este relatório reflete fielmente o estado do imóvel no momento da vistoria.
`;

  return texto;
}

async function gerarRelatorio(req, res) {
  const { idVistoria } = req.body;
  const comodos = JSON.parse(req.body.comodos || "{}");

  const data = new Date();
  const dataVistoria = data.toLocaleDateString("pt-BR");
  const horaVistoria = data.toLocaleTimeString("pt-BR");

  const imagensPorComodo = {};
  for (const file of req.files || []) {
    const match = file.fieldname.match(/^anexos_(.+)$/);
    if (match) {
      const comodo = match[1];
      if (!imagensPorComodo[comodo]) imagensPorComodo[comodo] = [];
      imagensPorComodo[comodo].push(file);
    }
  }

  try {
    const [detalhes] = await db`
      SELECT
        e.cep,
        e.nome AS nomeempreendimento,
        i.bloco,
        i.numero,
        f.nome AS nomevistoriador
      FROM vistoria v
      JOIN imovel i ON v.idimovel = i.idimovel
      JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
      JOIN funcionario f ON v.idvistoriador = f.id
      WHERE v.idvistoria = ${idVistoria}
    `;

    const localizacaoFormatada = `CEP: ${detalhes.cep}, ${detalhes.nomeempreendimento}, Bloco: ${detalhes.bloco}, N°: ${detalhes.numero}`;
    const texto = gerarTextoRelatorio(comodos);

    const nomeArquivo = `relatorio_${Date.now()}.pdf`;
    const caminho = path.join(__dirname, "../relatorios", nomeArquivo);
    const assinaturaPath = path.join(__dirname, "../assets/assinatura.png");
    const fundoPath = path.join(__dirname, "../assets/vistoria.png");

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(caminho);
    doc.pipe(stream);

    const desenharFundo = () => {
      if (fs.existsSync(fundoPath)) {
        doc.image(fundoPath, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
        });
      }
    };

    desenharFundo();
    doc.on("pageAdded", desenharFundo);

    doc.moveDown(2);
    doc.fontSize(14).text("Relatório Técnico de Vistoria", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Data da Vistoria: ${dataVistoria}`);
    doc.text(`Hora da Vistoria: ${horaVistoria}`);
    doc.text(`Localização do Imóvel: ${localizacaoFormatada}`);
    doc.text(`Responsável Técnico: ${detalhes.nomevistoriador}`);
    doc.moveDown();
    doc.fontSize(12).text(texto, { align: "left" });

    for (const [comodo, imagens] of Object.entries(imagensPorComodo)) {
      doc.addPage();
      doc.fontSize(14).text(`Imagens do cômodo: ${comodo}`, { align: "center" });
      doc.moveDown();

      for (const img of imagens) {
        try {
          doc.image(img.buffer, {
            fit: [450, 300],
            align: "center",
            valign: "center",
          });
          doc.moveDown();
        } catch (err) {
          console.error(`Erro ao inserir imagem ${img.originalname}:`, err);
        }
      }
    }

    doc.addPage();
    if (fs.existsSync(assinaturaPath)) {
      doc.image(assinaturaPath, { width: 120 });
    }
    doc.text(detalhes.nomevistoriador);
    doc.text("Engenheiro Responsável");

    doc.end();

    stream.on("finish", async () => {
      try {
        const storageUrl = "https://sictbgrpkhacrukvpopz.supabase.co/storage/v1/object";
        const filePath = `relatorios/${nomeArquivo}`;
        const pdfBuffer = fs.readFileSync(caminho);

        await fetch(`${storageUrl}/${filePath}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/pdf",
            "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: pdfBuffer,
        });

        const publicUrl = `${storageUrl}/public/${filePath}`;

        await db`
          UPDATE vistoria
          SET relatorio_url = ${publicUrl}, status = 'Aguardando Validação'
          WHERE idvistoria = ${idVistoria}
        `;

        res.json({
          mensagem: "Relatório gerado com sucesso.",
          arquivo: nomeArquivo,
          url: publicUrl,
        });
      } catch (err) {
        console.error("Erro ao enviar para o Supabase:", err);
        res.status(500).json({ erro: "Erro ao salvar relatório" });
      }
    });
  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    res.status(500).json({ erro: "Erro ao gerar relatório" });
  }
}

module.exports = { gerarRelatorio };
