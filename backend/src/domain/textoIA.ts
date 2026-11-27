// S12: limpeza do texto livre (observações do vistoriador) antes de ir para o prompt do Gemini.
// A validação de entrada (schemas.relatorioGeracao) já recusa observações acima de OBSERVACAO_MAX;
// aqui é a segunda barreira: tira caracteres invisíveis, marcadores de prompt e frases que tentam
// dar ordens ao modelo. O PDF continua usando o texto original (só a IA recebe a versão limpa).

export const OBSERVACAO_MAX = 2000;
export const TRECHO_REMOVIDO = '[trecho removido]';

// Controles (menos \n e \t), zero-width, marcas de direção (bidi) e BOM.
// eslint-disable-next-line no-control-regex -- remover caracteres de controle é exatamente o objetivo
const INVISIVEIS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

// Marcadores usados para "abrir" um novo bloco de prompt.
const MARCADORES = /```+|<\|[^|]*\|>|<\/?\s*(system|assistant|user|instructions?|prompt)\s*>/gi;

// Frases óbvias de injeção (pt-BR e inglês). Cada linha que bater é trocada por TRECHO_REMOVIDO.
// Os padrões exigem o verbo seguido de perto (até 3 palavras) por "instruções"/"regras"/"prompt",
// para não pegar texto técnico comum (ex.: "não ignorar a mancha acima da janela; revisar as regras...").
const INJECOES: RegExp[] = [
  /\b(ignore|disregard|forget)(\s+[\w'-]+){0,3}\s+(instructions?|rules|prompts?)\b/i,
  /\b(ignore|ignorar|desconsidere|desconsiderar|esque[cç]a|esquecer)(\s+[\wÀ-ú-]+){0,3}\s+(instru[cç](ão|ões|oes)|regras?|prompts?|comandos?)\b/i,
  /\b(novas?|outras?)\s+instru[cç](ão|ões|oes)\b/i,
  /\b(new|updated)\s+instructions?\b/i,
  /\b(system\s*prompt|prompt\s+do\s+sistema|jailbreak)\b/i,
  /\b(a\s+partir\s+de\s+agora|from\s+now\s+on)\b.{0,40}\b(voc[eê]|you)\b/i,
  /\b(you\s+are\s+now|voc[eê]\s+agora\s+[eé])\b/i,
  /^\s*(system|assistant|user|sistema|assistente|usu[aá]rio)\s*:/i,
  /\b(retorne|responda|escreva|return|respond|output)\b.{0,30}\b(apenas|somente|only)\b/i,
];

/** Devolve o texto pronto para o prompt, ou null se não sobrar nada. */
export function sanitizarTextoParaIA(texto: unknown, max = OBSERVACAO_MAX): string | null {
  if (texto === null || texto === undefined) return null;

  let t = String(texto).normalize('NFKC').replace(INVISIVEIS, '').replace(/\r\n?/g, '\n').replace(MARCADORES, ' ');

  t = t
    .split('\n')
    .map((linha) => linha.replace(/[ \t]+/g, ' ').trim())
    .map((linha) => (INJECOES.some((re) => re.test(linha)) ? TRECHO_REMOVIDO : linha))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (t.length > max) t = `${t.slice(0, max - 1).trimEnd()}…`;
  return t === '' ? null : t;
}
