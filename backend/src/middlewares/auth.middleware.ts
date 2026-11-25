import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { isPapel } from '../domain/papel';

function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ erro: 'Token não enviado.' });
  }

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Formato inválido. Use: Bearer <token>' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    // Tokens anteriores ao D1 (sem `papel`) são recusados: o usuário precisa logar de novo.
    if (typeof payload !== 'object' || !isPapel(payload.papel) || !Number.isInteger(Number(payload.sub))) {
      return res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
    req.usuario = { sub: Number(payload.sub), papel: payload.papel, iat: payload.iat, exp: payload.exp };
    return next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// `export =` mantém `require('../middlewares/auth.middleware')` funcionando nas rotas .js.
export = auth;
