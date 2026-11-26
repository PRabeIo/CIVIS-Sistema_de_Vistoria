// S5: autentica pelo cookie de sessão (ou Bearer) e confere no banco se a sessão segue ativa.
// O papel vem do banco, não do token: rebaixar/desativar/excluir vale na próxima requisição.
import type { NextFunction, Request, Response } from 'express';
import { accessDaRequisicao } from '../controllers/_cookies';
import { AppError } from '../domain/erros';
import { lerAccess, papelDaSessaoAtiva } from '../services/sessao.service';

async function auth(req: Request, _res: Response, next: NextFunction) {
  const token = accessDaRequisicao(req);
  if (!token) throw new AppError(401, 'NAO_AUTENTICADO', 'Sessão não encontrada. Faça login.');

  const payload = lerAccess(token);
  const papel = payload && (await papelDaSessaoAtiva(payload.sid, payload.sub));
  if (!payload || !papel) throw new AppError(401, 'NAO_AUTENTICADO', 'Sessão expirada ou encerrada. Faça login novamente.');

  req.usuario = { sub: payload.sub, papel, sid: payload.sid };
  next();
}

// `export =` mantém `require('../middlewares/auth.middleware')` funcionando nas rotas .js.
export = auth;
