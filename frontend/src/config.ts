// Endereços do backend, configuráveis por ambiente (ver frontend/.env.example).
const semBarraFinal = (url: string): string => url.replace(/\/$/, "");

export const SERVER_URL: string = semBarraFinal(import.meta.env.VITE_SERVER_URL || "http://localhost:3001");
export const API_BASE_URL: string = semBarraFinal(import.meta.env.VITE_API_URL || `${SERVER_URL}/api`);
