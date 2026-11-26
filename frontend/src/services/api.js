// src/services/api.js
// S5: a sessão vive em cookies httpOnly (o JavaScript não vê o token). Toda chamada vai com
// `credentials: "include"`; em 401, tenta renovar a sessão uma vez e repete a chamada.
import { API_BASE_URL } from "../config";

const urlDe = (path) => (path.startsWith("http") ? path : `${API_BASE_URL}${path}`);

// Rotas em que um 401 é resposta final (não faz sentido tentar renovar).
const SEM_RENOVACAO = ["/auth/login", "/auth/refresh", "/auth/logout"];

let renovacaoEmAndamento = null;

/** Renova a sessão (POST /auth/refresh). Chamadas simultâneas compartilham a mesma renovação. */
export function renovarSessao() {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = fetch(urlDe("/auth/refresh"), { method: "POST", credentials: "include" })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        renovacaoEmAndamento = null;
      });
  }
  return renovacaoEmAndamento;
}

function montarHeaders(options) {
  const headers = { ...(options.headers || {}) };
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;

  if (isFormData) {
    // deixa o navegador definir o multipart boundary
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === "content-type") delete headers[k];
    }
  } else if (!Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

/**
 * fetch com: baseURL, cookies de sessão, JSON automático (exceto FormData),
 * renovação automática da sessão e erro padronizado.
 */
export async function apiFetch(path, options = {}) {
  const executar = () => fetch(urlDe(path), { ...options, headers: montarHeaders(options), credentials: "include" });

  let response = await executar();

  if (response.status === 401 && !SEM_RENOVACAO.some((p) => path.startsWith(p))) {
    if (await renovarSessao()) {
      response = await executar();
    }
    if (response.status === 401) encerrarSessao();
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(mensagemDeErro(data, "Erro na resposta do servidor."));
  }

  return data;
}

/** Extrai a mensagem do corpo de erro da API: { erro: { codigo, mensagem } } (formato único desde o B3). */
export function mensagemDeErro(data, fallback = "Erro na resposta do servidor.") {
  return (typeof data?.erro?.mensagem === "string" && data.erro.mensagem) || fallback;
}

/**
 * Endereço completo de um caminho da API (ex.: o `relatorio_url` "/vistorias/1/relatorio").
 * Links para a API abertos no navegador levam o cookie de sessão (mesmo site).
 */
export function urlDaApi(caminho) {
  if (!caminho) return caminho;
  return caminho.startsWith("/") && !caminho.startsWith("//") ? `${API_BASE_URL}${caminho}` : caminho;
}

/** Tipos de imagem aceitos pelo backend nos uploads (S3). */
export const IMAGENS_ACEITAS = "image/jpeg,image/png,image/webp";
/** Fotos do relatório e assinatura: só JPEG/PNG, que o PDF consegue desenhar. */
export const IMAGENS_PDF = "image/jpeg,image/png";

/** Sessão inválida: limpa os dados locais e volta para o login. */
export function encerrarSessao() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("token"); // resquício de versões antigas
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

/** Revoga a sessão no servidor (apaga os cookies). Não bloqueia a navegação. */
export function logoutNoServidor() {
  return fetch(urlDe("/auth/logout"), { method: "POST", credentials: "include" }).catch(() => {});
}
