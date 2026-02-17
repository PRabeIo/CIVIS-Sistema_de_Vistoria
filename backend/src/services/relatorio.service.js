const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const db = require("../config/db");
const fetch = require("node-fetch");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* ---------------- TEXTO DO RELATÓRIO ---------------- */
function gerarTextoRelatorio(comodos) {
  let texto = "";

  for (const [nomeComodo, dados] of Object.entries(comodos)) {
    if (!dados) continue;

    texto += `\nCÔMODO: ${nomeComodo.toUpperCase()}\n`;

    for (const [item, valor] of Object.entries(dados)) {
      if (!valor) continue;
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

/* ---------------- SERVICE PRINCIPAL ---------------- */
async function gerar({ idVistoria, comodos, arquivos, idVistoriadorToken }) {
  const idVistoriaNum = Number(idVistoria);

  if (!idVistoriaNum) {
    throw { statusCode: 400, message: "idVistoria inválido." };
  }

  if (!idVistoriadorToken) {
    throw { statusCode: 401, message: "Token inválido." };
  }

  /* --------- Busca dados da vistoria --------- */
  const [detalhes] = await db`
    SELECT
      v.status,
      v.idvistoriador,
      e.cep,
      e.nome AS nomeempreendimento,
      i.bloco,
      i.numero,
      f.nome AS nomevistoriador,
      f.cpf
    FROM vistoria v
    JOIN imovel i ON v.idimovel = i.idimovel
    JOIN empreendimento e ON i.idempreendimento = e.idempreendimento
    JOIN funcionario f ON v.idvistoriador = f.id
    WHERE v.idvistoria = ${idVistoriaNum}
      AND v.idvistoriador = ${idVistoriadorToken}
    LIMIT 1
  `;

  if (!detalhes) {
    throw { statusCode: 404, message: "Vistoria não encontrada ou sem permissão." };
  }

  if (detalhes.status !== "Em Andamento") {
    throw { statusCode: 400, message: `Status atual: ${detalhes.status}` };
  }

  /* --------- Datas --------- */
  const data = new Date();
  const dataVistoria = data.toLocaleDateString("pt-BR");
  const horaVistoria = data.toLocaleTimeString("pt-BR");

  /* --------- Organiza imagens por cômodo --------- */
  const imagensPorComodo = {};
  for (const file of arquivos) {
    const match = file.fieldname.match(/^anexos_(.+)$/);
    if (match) {
      const comodo = match[1];
      if (!imagensPorComodo[comodo]) imagensPorComodo[comodo] = [];
      imagensPorComodo[comodo].push(file);
    }
  }

  const texto = gerarTextoRelatorio(comodos);

/* --------- Criar PDF --------- */
const nomeArquivo = `relatorio_${Date.now()}.pdf`;

const pastaRelatorios = path.join(__dirname, "..", "..", "relatorios");
const caminho = path.join(pastaRelatorios, nomeArquivo);


const assinaturaPath = path.join(__dirname, "..", "assets", "assinatura.png");
const fundoPath = path.join(__dirname, "..", "assets", "vistoria.png");

// garante que backend/relatorios existe
if (!fs.existsSync(pastaRelatorios)) {
  fs.mkdirSync(pastaRelatorios, { recursive: true });
}

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
  doc.fontSize(16).text("Relatório Técnico de Vistoria", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Data: ${dataVistoria}`);
  doc.text(`Hora: ${horaVistoria}`);
  doc.text(`Local: ${detalhes.nomeempreendimento} - Bloco ${detalhes.bloco} Nº ${detalhes.numero}`);
  doc.text(`Vistoriador: ${detalhes.nomevistoriador}`);
  doc.moveDown();

  doc.text(texto);

  /* imagens */
  for (const [comodo, imagens] of Object.entries(imagensPorComodo)) {
    doc.addPage();
    doc.fontSize(14).text(`Imagens - ${comodo}`, { align: "center" });
    doc.moveDown();

    for (const img of imagens) {
      try {
        doc.image(img.buffer, {
          fit: [450, 300],
          align: "center",
        });
        doc.moveDown();
      } catch {}
    }
  }

  doc.addPage();
  if (fs.existsSync(assinaturaPath)) {
    doc.image(assinaturaPath, { width: 120 });
  }
  doc.text(detalhes.nomevistoriador);
  doc.text("Responsável Técnico");

  doc.end();

  /* --------- Upload Supabase --------- */
  return new Promise((resolve, reject) => {
    stream.on("finish", async () => {
      try {
        const pdfBuffer = fs.readFileSync(caminho);
        const filePath = `relatorios/${nomeArquivo}`;

        await fetch(`${SUPABASE_URL}/storage/v1/object/${filePath}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/pdf",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: pdfBuffer,
        });

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${filePath}`;

        await db`
          UPDATE vistoria
          SET relatorio_url = ${publicUrl},
              status = 'Aguardando Validação'
          WHERE idvistoria = ${idVistoriaNum}
            AND idvistoriador = ${idVistoriadorToken}
        `;

        resolve({
          mensagem: "Relatório gerado com sucesso",
          arquivo: nomeArquivo,
          url: publicUrl,
        });

      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = { gerar };
