import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api";
import { API_BASE_URL } from "../config";

function mockFetch(status, body) {
  const fn = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("envia o token salvo no header Authorization", async () => {
    localStorage.setItem("token", "abc123");
    const fetch = mockFetch(200, { ok: true });

    await apiFetch("/vistorias");

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/vistorias`);
    expect(opts.headers.Authorization).toBe("Bearer abc123");
    expect(opts.headers["Content-Type"]).toBe("application/json");
  });

  it("não envia Authorization sem token", async () => {
    const fetch = mockFetch(200, {});
    await apiFetch("/auth/login", { method: "POST" });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("não força Content-Type quando o corpo é FormData", async () => {
    const fetch = mockFetch(200, {});
    await apiFetch("/upload", { method: "POST", body: new FormData(), headers: { "Content-Type": "x" } });
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("Content-Type");
  });

  it("401 com token encerra a sessão e manda para o login", async () => {
    localStorage.setItem("token", "token-antigo");
    localStorage.setItem("usuario", JSON.stringify({ tipo: "admin" }));
    const assign = vi.fn();
    vi.stubGlobal("location", { pathname: "/clientes", assign });
    mockFetch(401, { erro: "Token inválido ou expirado." });

    await expect(apiFetch("/clientes")).rejects.toThrow("Token inválido ou expirado.");
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("usuario")).toBeNull();
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("401 sem token (ex.: login errado) não mexe na sessão", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { pathname: "/login", assign });
    mockFetch(401, { erro: "Email ou senha inválidos." });

    await expect(apiFetch("/auth/login", { method: "POST" })).rejects.toThrow("Email ou senha inválidos.");
    expect(assign).not.toHaveBeenCalled();
  });

  it("lança erro com a mensagem do backend", async () => {
    mockFetch(403, { erro: "Acesso negado." });
    await expect(apiFetch("/x")).rejects.toThrow("Acesso negado.");
  });
});
