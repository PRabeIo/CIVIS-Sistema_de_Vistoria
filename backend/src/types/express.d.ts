import type { Papel } from '../domain/papel';

/** Payload do JWT anexado por auth.middleware em req.usuario (D1: sub = usuario.id). */
export interface UsuarioToken {
  sub: number;
  papel: Papel;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}
