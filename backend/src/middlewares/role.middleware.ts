import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../domain/erros';
import type { Papel } from '../domain/papel';

/** Libera a rota só para os papéis informados. */
export function exigirPapel(papeis: readonly Papel[], mensagem: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) return next(new AppError(401, 'NAO_AUTENTICADO', 'Não autenticado.'));
    if (!papeis.includes(req.usuario.papel)) return next(new AppError(403, 'PROIBIDO', mensagem));
    return next();
  };
}

export const apenasAdmin = exigirPapel(['admin'], 'Acesso permitido apenas para administradores.');
export const apenasVistoriador = exigirPapel(['vistoriador'], 'Acesso permitido apenas para vistoriadores.');
export const apenasCliente = exigirPapel(['cliente'], 'Acesso permitido apenas para clientes.');
export const apenasFuncionario = exigirPapel(
  ['admin', 'vistoriador'],
  'Acesso permitido apenas para funcionários.',
);
