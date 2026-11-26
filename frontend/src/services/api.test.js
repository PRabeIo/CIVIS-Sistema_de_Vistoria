import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, mensagemDeErro, urlDaApi } from "./api";
import { API_BASE_URL } from "../config";

function mockFetch(status, body) {
  const fn = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

/** Respostas em sequência para chamadas sucessivas de fetch. */
function mockFetchSeq(...respostas) {
  const fn = vi.fn();
  for (const [status, body] of respostas) {
    fn.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("apiFetch", () => {
  it("envia os cookies de sessão (credentials: include) e nunca um header Authorization", async () => {
    localStorage.setItem("token", "resquicio-antigo");
    const fetch = mockFetch(200, { ok: true });

    await apiFetch("/vistorias");

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/vistorias`);
    expect(opts.credentials).toBe("include");
    expect(opts.headers.Authorization).toBeUndefined();
    expect(opts.headers["Content-Type"]).toBe("application/json");
  });

  it("não força Content-Type quando o corpo é FormData", async () => {
    const fetch = mockFetch(200, {});
    await apiFetch("/upload", { method: "POST", body: new FormData(), headers: { "Content-Type": "x" } });
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("Content-Type");
  });

  it("401 → renova a sessão e repete a chamada", async () => {
    const fetch = mockFetchSeq([401, { erro: { mensagem: "expirada" } }], [200, { usuario: {} }], [200, [1, 2]]);

    await expect(apiFetch("/clientes")).resolves.toEqual([1, 2]);

    expect(fetch.mock.calls.map((c) => c[0])).toEqual([
      `${API_BASE_URL}/clientes`,
      `${API_BASE_URL}/auth/refresh`,
      `${API_BASE_URL}/clientes`,
    ]);
  });

  it("401 e renovação falha → encerra a sessão e manda para o login", async () => {
    localStorage.setItem("usuario", JSON.stringify({ tipo: "admin" }));
    const assign = vi.fn();
    vi.stubGlobal("location", { pathname: "/clientes", assign });
    mockFetchSeq([401, { erro: { mensagem: "Sessão expirada." } }], [401, {}]);

    await expect(apiFetch("/clientes")).rejects.toThrow("Sessão expirada.");
    expect(localStorage.getItem("usuario")).toBeNull();
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("401 no login não tenta renovar nem mexe na sessão", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { pathname: "/login", assign });
    const fetch = mockFetch(401, { erro: { mensagem: "Email ou senha inválidos." } });

    await expect(apiFetch("/auth/login", { method: "POST" })).rejects.toThrow("Email ou senha inválidos.");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it("lança erro com a mensagem do backend", async () => {
    mockFetch(403, { erro: { codigo: "PROIBIDO", mensagem: "Acesso negado." } });
    await expect(apiFetch("/x")).rejects.toThrow("Acesso negado.");
  });
});

describe("mensagemDeErro", () => {
  it("lê o formato padrão { erro: { codigo, mensagem } }", () => {
    expect(mensagemDeErro({ erro: { codigo: "VALIDACAO", mensagem: "CPF inválido." } })).toBe("CPF inválido.");
  });

  it("usa o fallback para qualquer outro formato (o legado saiu no B3)", () => {
    expect(mensagemDeErro({ error: "legado" }, "padrão")).toBe("padrão");
    expect(mensagemDeErro({ erro: { codigo: "X" } }, "padrão")).toBe("padrão");
    expect(mensagemDeErro(null, "padrão")).toBe("padrão");
  });

  it("apiFetch nunca mostra [object Object]", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ erro: { codigo: "VALIDACAO", mensagem: "Telefone inválido." } }),
    }));
    await expect(apiFetch("/clientes/me", { method: "PATCH" })).rejects.toThrow("Telefone inválido.");
  });
});

describe("urlDaApi", () => {
  it("transforma caminho da API em endereço completo e mantém URLs absolutas", () => {
    expect(urlDaApi("/vistorias/7/relatorio")).toBe(`${API_BASE_URL}/vistorias/7/relatorio`);
    expect(urlDaApi("https://exemplo.com/x.pdf")).toBe("https://exemplo.com/x.pdf");
    expect(urlDaApi("//evil.com/x")).toBe("//evil.com/x");
    expect(urlDaApi(null)).toBeNull();
  });
});
