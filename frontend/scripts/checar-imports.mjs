// B9: confere se todo import relativo aponta para um arquivo que existe com a MESMA caixa.
// No Windows/macOS "Home.css" e "home.css" funcionam; no Linux (CI, deploy) o build quebra.
// Uso: npm run check:imports
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..", "src");
const EXTENSOES = ["", ".js", ".jsx", ".ts", ".tsx", "/index.js", "/index.jsx", "/index.ts", "/index.tsx"];
const RE_IMPORT = /(?:import\s+(?:[^"'`]*?\s+from\s+)?|import\s*\(\s*|export\s+[^"'`]*?\s+from\s+)["']([^"']+)["']/g;

/** O caminho existe com exatamente esta caixa em cada segmento? */
function existeComCaixaExata(absoluto) {
  const rel = path.relative(RAIZ, absoluto);
  if (rel.startsWith("..")) return fs.existsSync(absoluto);
  let atual = RAIZ;
  for (const parte of rel.split(path.sep)) {
    if (!fs.existsSync(atual) || !fs.statSync(atual).isDirectory()) return false;
    if (!fs.readdirSync(atual).includes(parte)) return false;
    atual = path.join(atual, parte);
  }
  return true;
}

function arquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "_arquivadas" ? [] : arquivos(p); // fora do build
    return /\.(jsx?|tsx?)$/.test(e.name) ? [p] : [];
  });
}

const problemas = [];
for (const arquivo of arquivos(RAIZ)) {
  const codigo = fs.readFileSync(arquivo, "utf8");
  for (const [, alvo] of codigo.matchAll(RE_IMPORT)) {
    if (!alvo.startsWith(".")) continue;
    const base = path.resolve(path.dirname(arquivo), alvo);
    const ok = EXTENSOES.some((ext) => {
      const candidato = base + ext;
      return fs.existsSync(candidato) && fs.statSync(candidato).isFile() && existeComCaixaExata(candidato);
    });
    if (!ok) problemas.push(`${path.relative(RAIZ, arquivo)}: "${alvo}"`);
  }
}

if (problemas.length) {
  console.error(`Imports que não existem com essa caixa (quebram no Linux):\n  ${problemas.join("\n  ")}`);
  process.exit(1);
}
console.log("imports ok");
