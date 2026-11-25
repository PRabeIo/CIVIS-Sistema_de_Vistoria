// src/services/api.js
import { API_BASE_URL } from "../config";

export function getToken() {
  return localStorage.getItem("token");
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * fetch com:
 * - baseURL
 * - Authorization automático
 * - JSON automático (quando body não é FormData)
 * - erro padronizado
 *
 * ✅ Retrocompatível: não quebra páginas existentes
 * ✅ Suporta FormData: quando body é FormData, NÃO seta Content-Type
 */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;

  // headers base com auth
  const baseHeaders = authHeaders({
    ...(options.headers || {}),
  });

  // Só força JSON quando NÃO é FormData e quando ainda não veio um Content-Type customizado
  const headers = { ...baseHeaders };

  if (!isFormData) {
    const hasContentType =
      Object.keys(headers).some((k) => k.toLowerCase() === "content-type");
    if (!hasContentType) {
      headers["Content-Type"] = "application/json";
    }
  } else {
    // IMPORTANTÍSSIMO: deixar o browser setar multipart boundary
    // se alguém passou Content-Type manual, remove para evitar quebrar upload
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === "content-type") delete headers[k];
    }
  }

  const response = await fetch(url, { ...options, headers });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {}

  // Sessão inválida/expirada (ex.: tokens emitidos antes da unificação de usuários):
  // limpa a sessão e volta para o login. O tratamento completo (refresh, aviso) vem no U4.
  if (response.status === 401 && baseHeaders.Authorization) {
    encerrarSessao();
  }

  if (!response.ok) {
    const msg = data?.erro || data?.error || "Erro na resposta do servidor.";
    throw new Error(msg);
  }

  return data;
}

export function encerrarSessao() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}
