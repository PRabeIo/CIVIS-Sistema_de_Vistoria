const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function montarPrompt(context) {
  return `
Você é um engenheiro civil responsável por elaborar relatórios técnicos de vistoria imobiliária (pt-BR).

OBJETIVO:
Gerar um relatório técnico profissional, realista e coerente com os dados do JSON.

REGRAS CRÍTICAS (OBRIGATÓRIO):
- Use SOMENTE informações presentes no JSON.
- NÃO invente defeitos, causas, medições, materiais, marcas, produtos ou métodos específicos.
- NÃO cite normas técnicas (NBR/ABNT/lei).
- NÃO escreva "Não informado". Se não houver conteúdo, omita (deixe string vazia "" ou array vazio []).
- Evite texto genérico; conecte as conclusões aos estados registrados.
- Você NÃO viu imagens. Só mencione "conforme registro fotográfico anexado" quando fotos.qtd > 0.

COMO INTERPRETAR OS DADOS:
- Para cada cômodo, há "estados" (Estrutura, Pintura, Instalação Elétrica, etc.).
- Os valores possíveis: Péssimo, Ruim, Razoável, Bom, Excelente, ou null.
- Considere:
  Péssimo = intervenção urgente
  Ruim = intervenção necessária
  Razoável = atenção preventiva
  Bom/Excelente = sem ação relevante
- Use "severidade" (0..3) como guia da criticidade.

RECOMENDAÇÕES:
- Gere recomendações SOMENTE para itens Péssimo/Ruim/Razoável.
- As recomendações devem ser genéricas e técnicas (ex.: "recomenda-se manutenção corretiva", "revisão técnica", "correção de acabamento").
- NÃO especifique materiais ("tinta epóxi"), produtos, nem procedimentos detalhados.

SAÍDA:
Retorne APENAS um JSON válido (sem markdown, sem texto fora do JSON) neste formato EXATO:

{
  "resumo_executivo": "",
  "introducao": "",
  "metodologia": "",
  "achados_por_comodo": [
    {
      "comodo": "",
      "quantidade": "",
      "descricao_tecnica": "",
      "pontos_atencao": [],
      "recomendacoes": [],
      "severidade": 0,
      "referencia_imagens": ""
    }
  ],
  "nao_conformidades": [],
  "recomendacoes_gerais": [],
  "conclusao": ""
}

REGRAS DE PREENCHIMENTO:
- "descricao_tecnica" deve ser um parágrafo objetivo descrevendo o estado do cômodo com base em "estados" e "observacoes" (se houver).
- "pontos_atencao" deve listar apenas itens com Péssimo/Ruim/Razoável (ex.: "Pintura em estado ruim").
- "recomendacoes" deve corresponder aos pontos de atenção (uma recomendação por ponto, quando possível).
- "referencia_imagens":
  - Se fotos.qtd > 0: "Conforme registro fotográfico anexado."
  - Se fotos.qtd = 0: "" (vazio)

DADOS DA VISTORIA (JSON):
${JSON.stringify(context, null, 2)}
`.trim();
}

function validarRelatorioJSON(obj) {
  if (!obj || typeof obj !== "object") return false;
  if (!Array.isArray(obj.achados_por_comodo)) return false;

  // valida estrutura mínima por item
  for (const c of obj.achados_por_comodo) {
    if (!c || typeof c !== "object") return false;
    if (typeof c.comodo !== "string") return false;
    if (typeof c.quantidade !== "string") return false;
    if (typeof c.descricao_tecnica !== "string") return false;
    if (!Array.isArray(c.pontos_atencao)) return false;
    if (!Array.isArray(c.recomendacoes)) return false;
    // severidade pode vir como number ou string numérica; vamos aceitar number
    if (!(typeof c.severidade === "number" || c.severidade === null)) return false;
    if (typeof c.referencia_imagens !== "string") return false;
  }

  return true;
}

function extrairJsonSeguro(text) {
  const t = String(text || "").trim();
  // caminho feliz
  try {
    return JSON.parse(t);
  } catch {}

  // tenta recortar do primeiro "{" ao último "}"
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(t.slice(start, end + 1));
  }

  throw new Error("IA não retornou JSON válido.");
}

async function gerarRelatorioIA(context) {
  const model = "gemini-3-flash-preview";

  const resp = await ai.models.generateContent({
    model,
    contents: montarPrompt(context),
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
    },
  });

  const text = (resp.text || "").trim();
  const json = extrairJsonSeguro(text);

  // limpeza: garantir que não aparece "Não informado" (por garantia)
  const sanitizeString = (s) =>
    typeof s === "string" && s.trim().toLowerCase() === "não informado" ? "" : s;

  json.resumo_executivo = sanitizeString(json.resumo_executivo);
  json.introducao = sanitizeString(json.introducao);
  json.metodologia = sanitizeString(json.metodologia);
  json.conclusao = sanitizeString(json.conclusao);

  if (Array.isArray(json.achados_por_comodo)) {
    json.achados_por_comodo = json.achados_por_comodo.map((c) => ({
      ...c,
      comodo: sanitizeString(c.comodo) || "",
      quantidade: sanitizeString(c.quantidade) || "",
      descricao_tecnica: sanitizeString(c.descricao_tecnica) || "",
      referencia_imagens: sanitizeString(c.referencia_imagens) || "",
      pontos_atencao: Array.isArray(c.pontos_atencao)
        ? c.pontos_atencao.map(sanitizeString).filter((x) => x && x.trim())
        : [],
      recomendacoes: Array.isArray(c.recomendacoes)
        ? c.recomendacoes.map(sanitizeString).filter((x) => x && x.trim())
        : [],
    }));
  }

  if (!validarRelatorioJSON(json)) {
    throw new Error("JSON do relatório não passou na validação.");
  }

  return json;
}

module.exports = { gerarRelatorioIA };