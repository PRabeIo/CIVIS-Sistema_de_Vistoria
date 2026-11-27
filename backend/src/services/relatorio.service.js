const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const PDFDocument = require("pdfkit");
const db = require("../config/db");
const storage = require("./storage.service");
const { AppError } = require("../domain/erros");

const { gerarRelatorioIA } = require("./relatorioAI.service");
const { verificarTransicao } = require("../domain/vistoriaStatus");
const { transicionar } = require("./transicao.service");
const { sanitizarTextoParaIA } = require("../domain/textoIA");

const CAMPOS = [
  { key: "Estrutura", label: "Estrutura" },
  { key: "Pintura", label: "Pintura" },
  { key: "InstalacaoEletrica", label: "Instalação Elétrica" },
  { key: "InstalacaoHidraulica", label: "Instalação Hidráulica" },
  { key: "Piso", label: "Piso" },
  { key: "Telhado", label: "Telhado" },
];

const COMODO_LABEL = {
  quartos: "Quartos",
  banheiros: "Banheiros",
  sala: "Sala",
  cozinha: "Cozinha",
  varanda: "Varanda",
};

function estadoParaSeveridade(estado) {
  const s = String(estado || "").trim().toLowerCase();
  if (s === "péssimo" || s === "pessimo") return 3;
  if (s === "ruim") return 2;
  if (s === "razoável" || s === "razoavel") return 1;
  if (s === "bom" || s === "excelente") return 0;
  return null;
}

function calcularSeveridadeComodo(dadosComodo) {
  let pior = 0;
  let temAlgum = false;

  for (const { key } of CAMPOS) {
    const sev = estadoParaSeveridade(dadosComodo?.[key]);
    if (sev === null) continue;
    temAlgum = true;
    if (sev > pior) pior = sev;
  }

  return temAlgum ? pior : null;
}

function filtrarComodosAtivos(comodos) {
  const out = {};
  for (const [k, v] of Object.entries(comodos || {})) {
    const qtd = String(v?.Quantidade ?? "").trim();
    const ativo = qtd !== "" && qtd !== "0";
    if (!ativo) continue;
    out[k] = v;
  }
  return out;
}

/* --------- fallback simples se IA falhar --------- */
function gerarTextoRelatorioSimples(comodosAtivos, fotosResumo = {}) {
  let texto = "";

  for (const [nomeComodo, dados] of Object.entries(comodosAtivos || {})) {
    const label = COMODO_LABEL[nomeComodo] || nomeComodo;

    texto += `\nCÔMODO: ${String(label).toUpperCase()}\n`;
    texto += `• Quantidade: ${String(dados?.Quantidade ?? "").trim() || "-"}\n`;

    for (const { key, label: campoLabel } of CAMPOS) {
      const val = String(dados?.[key] || "").trim();
      if (val) texto += `• ${campoLabel}: ${val}.\n`;
    }

    const obs = String(dados?.observacoes || "").trim();
    if (obs) texto += `• Observações: ${obs}\n`;

    const qtdFotos = fotosResumo?.[nomeComodo]?.qtd || 0;
    if (qtdFotos > 0) texto += `• Registro fotográfico: ${qtdFotos} anexo(s).\n`;

    texto += "\n";
  }

  texto += `
CONCLUSÃO TÉCNICA:

Com base nas informações registradas durante a vistoria, o imóvel apresenta as condições descritas acima.
Recomenda-se a correção dos pontos observados e, quando necessário, avaliação por profissional habilitado.

Este relatório reflete o estado do imóvel no momento da vistoria.
`.trim();

  return texto;
}

/* --------- render do JSON da IA no PDF (sem “Não informado”) --------- */
function escreverSecao(doc, titulo, texto) {
  const t = texto && String(texto).trim() ? String(texto).trim() : "";
  if (!t) return; // omite seção se vazio
  doc.moveDown();
  doc.fontSize(13).text(titulo, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(t);
}

function escreverLista(doc, titulo, itens) {
  const arr = Array.isArray(itens)
    ? itens.map((x) => String(x || "").trim()).filter(Boolean)
    : [];

  if (arr.length === 0) return; // omite seção se vazio

  doc.moveDown();
  doc.fontSize(13).text(titulo, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  for (const it of arr) doc.text(`• ${it}`);
}

function renderizarRelatorioIAPdf(doc, rel) {
  escreverSecao(doc, "Resumo Executivo", rel.resumo_executivo);
  escreverSecao(doc, "Introdução", rel.introducao);
  escreverSecao(doc, "Metodologia", rel.metodologia);

  const lista = Array.isArray(rel.achados_por_comodo) ? rel.achados_por_comodo : [];
  if (lista.length > 0) {
    doc.addPage();
    doc.fontSize(13).text("Achados por Cômodo", { underline: true });
    doc.moveDown();

    for (const c of lista) {
      const nome = c?.comodo ? String(c.comodo).trim() : "";
      const qtd = c?.quantidade ? String(c.quantidade).trim() : "";
      const sev =
        Number.isFinite(c?.severidade) ? String(c.severidade) : "";

      if (nome) doc.fontSize(12).text(`Cômodo: ${nome}`);
      if (qtd) doc.fontSize(11).text(`Quantidade: ${qtd}`);
      if (sev) doc.fontSize(11).text(`Severidade: ${sev}`);
      doc.moveDown(0.25);

      const desc = c?.descricao_tecnica ? String(c.descricao_tecnica).trim() : "";
      if (desc) {
        doc.fontSize(11).text(desc);
        doc.moveDown(0.25);
      }

      const pontos = Array.isArray(c?.pontos_atencao)
        ? c.pontos_atencao.map((x) => String(x || "").trim()).filter(Boolean)
        : [];
      if (pontos.length > 0) {
        doc.fontSize(11).text("Pontos de atenção:");
        for (const p of pontos) doc.text(`• ${p}`);
        doc.moveDown(0.25);
      }

      const recs = Array.isArray(c?.recomendacoes)
        ? c.recomendacoes.map((x) => String(x || "").trim()).filter(Boolean)
        : [];
      if (recs.length > 0) {
        doc.fontSize(11).text("Recomendações:");
        for (const r of recs) doc.text(`• ${r}`);
        doc.moveDown(0.25);
      }

      const refImg = c?.referencia_imagens ? String(c.referencia_imagens).trim() : "";
      if (refImg) {
        doc.fontSize(11).text(`Registro fotográfico: ${refImg}`);
        doc.moveDown(0.25);
      }

      doc.moveDown();
    }
  }

  escreverLista(doc, "Não Conformidades", rel.nao_conformidades);
  escreverLista(doc, "Recomendações Gerais", rel.recomendacoes_gerais);
  escreverSecao(doc, "Conclusão", rel.conclusao);

  // Observações: só imprime se vier texto útil
  escreverSecao(doc, "Observações", rel.observacoes);
}

async function gerar({ idVistoria, comodos, arquivos, idVistoriadorToken }) {
  const ator = { sub: Number(idVistoriadorToken), papel: "vistoriador" };
  const idVistoriaNum = Number(idVistoria);

  if (!idVistoriaNum) throw { statusCode: 400, message: "idVistoria inválido." };
  if (!idVistoriadorToken) throw { statusCode: 401, message: "Token inválido." };

  /* --------- Busca dados da vistoria --------- */
  const [detalhes] = await db`
    SELECT
      v.status,
      v.idvistoriador,
      v.datahorainicio,
      f.assinatura,
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

  if (!detalhes) throw new AppError(404, "NAO_ENCONTRADO", "Vistoria não encontrada ou sem permissão.");
  // F1: confere antes de gastar IA e PDF; a transição de verdade (com trava) acontece no fim.
  if (!verificarTransicao("gerarRelatorio", { ...detalhes, idcliente: null }, ator).ok) {
    throw new AppError(409, "TRANSICAO_INVALIDA", `Não é possível gerar o relatório de uma vistoria com status "${detalhes.status}".`);
  }

  // B12: a data do relatório é a do início da vistoria (não a da geração do PDF).
  const data = detalhes.datahorainicio ? new Date(detalhes.datahorainicio) : new Date();
  const dataVistoria = data.toLocaleDateString("pt-BR");
  const horaVistoria = data.toLocaleTimeString("pt-BR");

  /* --------- Organiza anexos por cômodo --------- */
  const imagensPorComodo = {};
  for (const file of arquivos || []) {
    const match = file.fieldname?.match(/^anexos_(.+)$/);
    if (!match) continue;
    const comodo = match[1];
    if (!imagensPorComodo[comodo]) imagensPorComodo[comodo] = [];
    imagensPorComodo[comodo].push(file);
  }

  const fotosResumo = {};
  for (const [comodo, imgs] of Object.entries(imagensPorComodo)) {
    fotosResumo[comodo] = { qtd: imgs.length };
  }

  /* --------- Filtra cômodos com Quantidade > 0 --------- */
  const comodosAtivos = filtrarComodosAtivos(comodos);

  /* --------- Monta contexto para IA (SEM avaliacoes/principais_achados) --------- */
  const comodosParaIA = {};
  for (const [k, v] of Object.entries(comodosAtivos)) {
    const label = COMODO_LABEL[k] || k;
    const severidade = calcularSeveridadeComodo(v);

    comodosParaIA[k] = {
      comodo: label,
      quantidade: String(v?.Quantidade ?? "").trim(),
      estados: {
        Estrutura: v?.Estrutura || null,
        Pintura: v?.Pintura || null,
        InstalacaoEletrica: v?.InstalacaoEletrica || null,
        InstalacaoHidraulica: v?.InstalacaoHidraulica || null,
        Piso: v?.Piso || null,
        Telhado: v?.Telhado || null,
      },
      // S12: só a IA recebe a versão limpa; o PDF usa o texto original (já limitado pelo schema).
      observacoes: sanitizarTextoParaIA(v?.observacoes),
      severidade,
      fotos: { qtd: fotosResumo?.[k]?.qtd || 0 },
    };
  }

  // S12: campos cadastrados também passam pela limpeza (são texto livre de outros usuários).
  // S11: minimização — nenhum dado pessoal (nome, CPF) vai para a IA; o nome do vistoriador entra só no PDF.
  const curto = (v) => sanitizarTextoParaIA(v, 150);
  const contextIA = {
    dataVistoria,
    horaVistoria,
    local: {
      empreendimento: curto(detalhes.nomeempreendimento),
      cep: curto(detalhes.cep),
      bloco: curto(detalhes.bloco),
      numero: curto(detalhes.numero),
    },
    comodos: comodosParaIA,
  };

  /* --------- Geração via IA (com fallback) --------- */
  let relatorioIA = null;
  try {
    relatorioIA = await gerarRelatorioIA(contextIA);
  } catch (e) {
    console.error("[IA] Falha ao gerar relatório via Gemini. Usando fallback:", e?.message || e);
  }

  /* --------- Criar PDF (S2: só em memória, nunca em pasta pública) --------- */
  const fundoPath = path.join(__dirname, "..", "assets", "vistoria.png");

  const doc = new PDFDocument();
  const partes = [];
  doc.on("data", (parte) => partes.push(parte));
  const pdfPronto = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
  });

  const desenharFundo = () => {
    if (fs.existsSync(fundoPath)) {
      doc.image(fundoPath, 0, 0, { width: doc.page.width, height: doc.page.height });
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

  if (relatorioIA) {
    renderizarRelatorioIAPdf(doc, relatorioIA);
  } else {
    const texto = gerarTextoRelatorioSimples(comodosAtivos, fotosResumo);
    doc.fontSize(11).text(texto);
  }

  /* --------- Imagens (igual ao seu fluxo atual) --------- */
  for (const [comodo, imagens] of Object.entries(imagensPorComodo)) {
    doc.addPage();
    doc.fontSize(14).text(`Imagens - ${COMODO_LABEL[comodo] || comodo}`, { align: "center" });
    doc.moveDown();

    for (const img of imagens) {
      try {
        doc.image(img.buffer, { fit: [450, 300], align: "center" });
        doc.moveDown();
      } catch {
        // imagem inválida/corrompida: ignora e segue com as demais
      }
    }
  }

  doc.addPage();
  // B12: assinatura opcional do vistoriador (cadastrada no perfil); sem ela, só o nome.
  if (detalhes.assinatura) {
    try {
      doc.image(detalhes.assinatura, { width: 120 });
    } catch {
      // imagem inválida: segue só com o nome
    }
  }
  doc.text(detalhes.nomevistoriador);
  doc.text("Responsável Técnico");

  doc.end();
  const pdf = await pdfPronto;

  /* --------- Storage privado (S2): chave com UUID, nada adivinhável --------- */
  const chave = `relatorios/vistoria-${idVistoriaNum}/${randomUUID()}.pdf`;
  try {
    await storage.salvar(chave, pdf, "application/pdf");
  } catch (err) {
    // B11: storage fora do ar → 502 e a vistoria continua "Em Andamento" (o vistoriador pode tentar de novo).
    console.error(`[relatorio] falha ao salvar o PDF da vistoria ${idVistoriaNum}:`, err);
    throw new AppError(502, "STORAGE_INDISPONIVEL", "Não foi possível salvar o relatório agora. Tente novamente em instantes.");
  }

  // F1: Em Andamento → Aguardando Validação pela máquina de estados (409 se mudou durante a geração).
  await transicionar({ idvistoria: idVistoriaNum, acao: "gerarRelatorio", ator, campos: { relatorio_arquivo: chave } });

  return {
    mensagem: "Relatório gerado com sucesso",
    arquivo: `relatorio-vistoria-${idVistoriaNum}.pdf`,
    // caminho na API (exige sessão e permissão): GET /api/vistorias/:id/relatorio
    url: `/vistorias/${idVistoriaNum}/relatorio`,
    gerado_por_ia: Boolean(relatorioIA),
  };
}

module.exports = {
  COMODOS: Object.keys(COMODO_LABEL), gerar };