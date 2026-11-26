// Utilitários compartilhados pelos controllers (S7/S9).
// Express 5 encaminha erros de funções async para o handler central: os controllers só lançam.
import type { Request } from 'express';
import fs from 'fs';
import { AppError } from '../domain/erros';
import type { UsuarioToken } from '../types/express';

/** Usuário autenticado (as rotas já passaram pelo auth.middleware). */
export function usuarioDe(req: Request): UsuarioToken {
  if (!req.usuario) throw new AppError(401, 'NAO_AUTENTICADO', 'Não autenticado.');
  return req.usuario;
}

/** Lança 404 quando o resultado não existe; senão devolve o próprio valor. */
export function ou404<T>(valor: T | null | undefined | false, mensagem: string): T {
  if (valor === null || valor === undefined || valor === false) {
    throw new AppError(404, 'NAO_ENCONTRADO', mensagem);
  }
  return valor;
}

/** Troca `undefined` por `null` (o postgres.js não aceita `undefined` em parâmetros). */
export function comNulos<T extends object, K extends string>(
  dados: T,
  chaves: readonly K[],
): Omit<T, K> & { [P in K]: P extends keyof T ? Exclude<T[P], undefined> | null : null } {
  const r: Record<string, unknown> = { ...(dados as Record<string, unknown>) };
  for (const k of chaves) r[k] = r[k] ?? null;
  return r as never;
}

/** Remove os arquivos que o multer já gravou em disco (ex.: quando a validação do corpo falha). */
export function descartarUploads(req: Request): void {
  const arquivos = [
    ...(req.file ? [req.file] : []),
    ...(Array.isArray(req.files) ? req.files : Object.values(req.files ?? {}).flat()),
  ];
  for (const f of arquivos) {
    if (f.path) fs.promises.unlink(f.path).catch(() => {});
  }
}

/** Executa `fn`; se lançar, apaga os uploads da requisição e relança. */
export async function limparUploadsSeFalhar<T>(req: Request, fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    descartarUploads(req);
    throw err;
  }
}
