import type { NextFunction, Request, Response } from 'express';
import type { Papel } from '../domain/papel';

/** Libera a rota só para os papéis informados. */
export function exigirPapel(papeis: readonly Papel[], mensagem: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) return res.status(401).json({ erro: 'Não autenticado.' });
    if (!papeis.includes(req.usuario.papel)) return res.status(403).json({ erro: mensagem });
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
