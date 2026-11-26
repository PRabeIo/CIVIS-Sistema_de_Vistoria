// S7: tratamento central de erros. Nenhum detalhe interno (SQL, stack) vai para a resposta.
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { AppError, type CodigoErro } from '../domain/erros';

/** Formato padrão de erro da API (o antigo campo `error` saiu no B3). */
export interface CorpoErro {
  erro: { codigo: CodigoErro; mensagem: string; campos?: Record<string, string>; requestId?: string };
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const recebido = req.header('x-request-id');
  req.id = recebido && /^[\w-]{8,64}$/.test(recebido) ? recebido : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

export function rotaNaoEncontrada(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NAO_ENCONTRADO', 'Rota não encontrada.'));
}

/** Converte qualquer erro conhecido em AppError; o resto vira 500 genérico. */
export function paraAppError(err: unknown): AppError | null {
  if (err instanceof AppError) return err;

  const e = err as {
    type?: string;
    code?: string;
    constraint_name?: string;
    statusCode?: number;
    status?: number;
    message?: string;
  };

  // corpo JSON malformado (express.json)
  if (e?.type === 'entity.parse.failed') return new AppError(400, 'JSON_INVALIDO', 'O corpo da requisição não é um JSON válido.');
  if (e?.type === 'entity.too.large') return new AppError(413, 'ARQUIVO_GRANDE', 'Requisição grande demais.');

  if (err instanceof MulterError) {
    return err.code === 'LIMIT_FILE_SIZE'
      ? new AppError(413, 'ARQUIVO_GRANDE', 'Arquivo maior que o permitido.')
      : new AppError(400, 'ARQUIVO_INVALIDO', 'Envio de arquivo inválido.');
  }

  // Postgres
  if (e?.code === '23505') {
    if (e.constraint_name === 'usuario_email_key') return new AppError(409, 'EMAIL_EM_USO', 'Email já cadastrado.');
    if (e.constraint_name?.endsWith('_cpf_key')) return new AppError(409, 'CPF_EM_USO', 'CPF já cadastrado.');
    return new AppError(409, 'CONFLITO', 'Registro duplicado.');
  }
  if (e?.code === '23503') return new AppError(409, 'REFERENCIA_INVALIDA', 'Registro relacionado não existe ou ainda está em uso.');
  if (e?.code === '22P02' || e?.code === '22007' || e?.code === '22008') {
    return new AppError(400, 'VALIDACAO', 'Valor em formato inválido.');
  }

  // Legado: services .js que lançam Error com statusCode 4xx e mensagem de negócio.
  const status = e?.statusCode ?? e?.status;
  if (typeof status === 'number' && status >= 400 && status < 500 && e?.message) {
    return new AppError(status, status === 404 ? 'NAO_ENCONTRADO' : 'REGRA_DE_NEGOCIO', e.message);
  }

  return null;
}

export function tratarErros(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const conhecido = paraAppError(err);

  if (conhecido) {
    const corpo: CorpoErro = {
      erro: { codigo: conhecido.codigo, mensagem: conhecido.message, ...(conhecido.campos && { campos: conhecido.campos }) },
    };
    return res.status(conhecido.status).json(corpo);
  }

  // 500: loga tudo internamente, responde só o id para rastrear.
  console.error(`[erro ${req.id}] ${req.method} ${req.originalUrl}`, err);
  const mensagem = 'Erro interno do servidor. Tente novamente mais tarde.';
  const corpo: CorpoErro = { erro: { codigo: 'ERRO_INTERNO', mensagem, requestId: req.id } };
  return res.status(500).json(corpo);
}
