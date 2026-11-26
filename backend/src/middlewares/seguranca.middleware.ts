// S4: cabeçalhos de segurança (helmet) e limite de tentativas (rate limit).
import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { AppError } from '../domain/erros';

const numeroEnv = (nome: string, padrao: number) => Number(process.env[nome]) || padrao;

/**
 * helmet com dois ajustes:
 * - Cross-Origin-Resource-Policy `same-site`: o frontend (outra porta/subdomínio do mesmo site)
 *   precisa exibir as imagens de /uploads.
 * - CSP mínima: a API só serve JSON, arquivos e PDFs; nada de scripts.
 */
export const cabecalhosSeguranca = helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: {
    useDefaults: false,
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
  },
});

function limite(opcoes: { janelaMs: number; max: number; chave: (req: Request) => string; mensagem: string; soFalhas?: boolean }) {
  return rateLimit({
    windowMs: opcoes.janelaMs,
    limit: opcoes.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: opcoes.soFalhas ?? false,
    keyGenerator: opcoes.chave,
    handler: (_req, _res, next) => next(new AppError(429, 'MUITAS_TENTATIVAS', opcoes.mensagem)),
  });
}

const ip = (req: Request) => ipKeyGenerator(req.ip ?? '');

/** Login: 5 tentativas erradas a cada 15 min por IP + e-mail (logins certos não contam). */
export const limiteLogin = limite({
  janelaMs: 15 * 60 * 1000,
  max: numeroEnv('RATE_LIMIT_LOGIN_MAX', 5),
  soFalhas: true,
  chave: (req) => `${ip(req)}|${String(req.body?.email ?? '').trim().toLowerCase()}`,
  mensagem: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
});

/** Cadastro público: 10 por hora por IP. */
export const limiteCadastro = limite({
  janelaMs: 60 * 60 * 1000,
  max: numeroEnv('RATE_LIMIT_CADASTRO_MAX', 10),
  chave: ip,
  mensagem: 'Muitos cadastros a partir deste endereço. Tente novamente mais tarde.',
});

/** Refresh de sessão: protege contra força bruta de refresh tokens. */
export const limiteRefresh = limite({
  janelaMs: 15 * 60 * 1000,
  max: numeroEnv('RATE_LIMIT_REFRESH_MAX', 60),
  soFalhas: true,
  chave: ip,
  mensagem: 'Muitas tentativas de renovar a sessão. Faça login novamente.',
});
