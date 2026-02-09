const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const OpenAI = require("openai");
const nodemailer = require("nodemailer");
const db = require("../db");
const fetch = require("node-fetch");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

async function gerarRelatorio(req, res) {
  
  const { idVistoria, CPFVistoriador } = req.body;
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
    // Corrigido: cep está na tabela 'empreendimento'
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

    const prompt = `
Gere um relatório técnico claro e objetivo com base nas informações abaixo:

Informações dos cômodos vistoriados:
${JSON.stringify(comodos, null, 2)}

Organize as informações por cômodo, detalhe cada aspecto técnico (estrutura, pintura, instalações, piso, telhado, etc.), enumere e explique objetivamente (caso o comodo for "0" ou " " ou "N/A" não coloque ele no relatório).

No final, inclua uma conclusão com observações gerais, recomendações técnicas e considerações relevantes com base no estado geral do imóvel.

Não inclua assinatura, cabeçalho ou rodapé.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Você é um engenheiro civil que escreve relatórios técnicos claros, objetivos e bem estruturados.",
        },
        { role: "user", content: prompt },
      ],
    });

    const texto = response.choices[0].message.content;

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
        const [dados] = await db`
          SELECT c.email AS email_cliente, f.email AS email_vistoriador
          FROM vistoria v
          JOIN cliente c ON v.idcliente = c.idcliente
          JOIN funcionario f ON v.idvistoriador = f.id
          WHERE v.idvistoria = ${idVistoria}
        `;

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: dados.email_cliente,
          subject: "Relatório Técnico de Vistoria",
          text: "Segue em anexo o relatório técnico da sua vistoria.",
          attachments: [{ filename: nomeArquivo, path: caminho }],
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: dados.email_vistoriador,
          subject: "Relatório Técnico de Vistoria",
          text: "Segue em anexo o relatório técnico gerado.",
          attachments: [{ filename: nomeArquivo, path: caminho }],
        });

        const storageUrl = "https://sictbgrpkhacrukvpopz.supabase.co/storage/v1/object";
        const bucketName = "relatorios";
        const filePath = `relatorios/${nomeArquivo}`;
        const pdfBuffer = fs.readFileSync(caminho);

        const uploadResponse = await fetch(`${storageUrl}/${filePath}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/pdf",
            "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: pdfBuffer,
        });

        if (!uploadResponse.ok) {
          return res.status(500).json({ erro: "Erro ao subir PDF para Supabase" });
        }

        const publicUrl = `${storageUrl}/public/${filePath}`;

        await db`
          UPDATE vistoria
          SET relatorio_url = ${publicUrl}, status = 'Aguardando Validação'
          WHERE idvistoria = ${idVistoria}
        `;

        await db`
          UPDATE imovel
          SET vistoriasrealizadas = vistoriasrealizadas + 1
          WHERE idimovel = (
            SELECT idimovel FROM vistoria WHERE idvistoria = ${idVistoria}
          )
        `;

        res.json({
          mensagem: "Relatório gerado e enviado com sucesso.",
          arquivo: nomeArquivo,
          url: publicUrl,
        });
      } catch (emailError) {
        console.error("Erro no envio de e-mails:", emailError);
        res.status(500).json({ erro: "Erro ao enviar e-mail com o relatório" });
      }
    });
  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    res.status(500).json({ erro: "Erro ao gerar relatório" });
  }
}

module.exports = { gerarRelatorio };
