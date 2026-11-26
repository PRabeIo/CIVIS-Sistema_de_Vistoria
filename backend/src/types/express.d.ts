import type { Papel } from '../domain/papel';

/** Usuário autenticado, anexado por auth.middleware em req.usuario (D1: sub = usuario.id). */
export interface UsuarioToken {
  sub: number;
  /** Papel lido do banco a cada requisição (S5), não do token. */
  papel: Papel;
  /** Id da sessão (tabela `sessao`). */
  sid: string;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
      /** Id de correlação da requisição (erro.middleware). */
      id?: string;
    }
  }
}
