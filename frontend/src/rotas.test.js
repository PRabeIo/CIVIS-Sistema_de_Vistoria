// B10: todo link do código (navigate("..."), to="...", to: "...") precisa apontar para uma rota
// que existe para o papel daquela tela. Evita links para telas desligadas ou de outro perfil.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROTAS_POR_PAPEL, ROTAS_PUBLICAS } from "./rotas";
import { NAV_BY_TIPO } from "./utils/navConfig";

const SRC = path.resolve(import.meta.dirname);
const TODAS = [...new Set([...ROTAS_PUBLICAS, ...Object.values(ROTAS_POR_PAPEL).flat()])];

/** Papéis que usam cada pasta de telas (VistoriaDetalhes do cliente também é aberta pelo admin). */
function papeisDoArquivo(rel) {
  if (rel.includes("HomeCliente/VistoriaDetalhes/")) return ["cliente", "admin"];
  if (rel.startsWith("pages/HomeAdm/")) return ["admin"];
  if (rel.startsWith("pages/HomeCliente/")) return ["cliente"];
  if (rel.startsWith("pages/HomeVistoriador/")) return ["vistoriador"];
  return null; // telas públicas e componentes compartilhados
}

const casa = (padrao, destino) => {
  const p = padrao.split("/");
  const d = destino.split("/");
  return p.length === d.length && p.every((s, i) => s.startsWith(":") || d[i] === "*" || s === d[i]);
};

function arquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "_arquivadas" ? [] : arquivos(p);
    return /\.jsx?$/.test(e.name) && !e.name.includes(".test.") ? [p] : [];
  });
}

const RE_LINK = /(?:navigate\(\s*|\bto=\{?\s*|\bto:\s*)(["'`])(\/[^"'`]*)\1/g;

function links() {
  return arquivos(SRC).flatMap((arquivo) => {
    const rel = path.relative(SRC, arquivo).split(path.sep).join("/");
    const codigo = fs.readFileSync(arquivo, "utf8");
    return [...codigo.matchAll(RE_LINK)].map(([, , alvo]) => ({
      rel,
      // `${id}` vira um segmento qualquer; a query string não faz parte da rota
      destino: alvo.replace(/\$\{[^}]+\}/g, "*").split("?")[0],
    }));
  });
}

describe("B10: links e rotas", () => {
  it("encontra os links do código (sanidade do teste)", () => {
    expect(links().length).toBeGreaterThan(50);
  });

  it("todo link aponta para uma rota existente do papel da tela", () => {
    const quebrados = links()
      .filter(({ rel, destino }) => {
        const papeis = papeisDoArquivo(rel);
        const permitidas = papeis ? [...ROTAS_PUBLICAS, ...papeis.flatMap((p) => ROTAS_POR_PAPEL[p])] : TODAS;
        // para telas de mais de um papel, o link precisa valer para todos eles
        const valeParaTodos = papeis
          ? papeis.every((p) => [...ROTAS_PUBLICAS, ...ROTAS_POR_PAPEL[p]].some((r) => casa(r, destino)))
          : permitidas.some((r) => casa(r, destino));
        return !valeParaTodos;
      })
      .map(({ rel, destino }) => `${rel} → ${destino}`);
    expect(quebrados).toEqual([]);
  });

  it("os menus da navbar só levam a rotas do próprio papel", () => {
    for (const [papel, itens] of Object.entries(NAV_BY_TIPO)) {
      for (const { to } of itens) expect(ROTAS_POR_PAPEL[papel], `${papel}: ${to}`).toContain(to);
    }
  });
});
