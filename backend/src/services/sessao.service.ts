// S5: sessões revogáveis. Access token curto (JWT com o id da sessão) + refresh token opaco,
// rotacionado a cada uso e guardado só como hash SHA-256.
import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../config/db';
import type { Executor } from '../config/transacao';
import type { Papel } from '../domain/papel';

const minutos = (n: number) => n * 60;
export const ACCESS_TTL_SEG = minutos(Number(process.env.SESSAO_ACCESS_MIN) || 15);
export const REFRESH_TTL_SEG = Number(process.env.SESSAO_REFRESH_DIAS || 7) * 24 * 60 * 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MetaSessao {
  userAgent?: string | null;
  ip?: string | null;
}

export interface TokensSessao {
  sid: string;
  access: string;
  refresh: string;
}

function segredo(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET não configurado.');
  return s;
}

const hash = (refresh: string) => createHash('sha256').update(refresh).digest('hex');
const novoRefresh = () => randomBytes(32).toString('base64url');

export function assinarAccess(usuarioId: number, sid: string): string {
  return jwt.sign({ sub: usuarioId, sid }, segredo(), { expiresIn: ACCESS_TTL_SEG });
}

/** Valida assinatura/expiração do access token. Não consulta o banco. */
export function lerAccess(token: string): { sub: number; sid: string } | null {
  try {
    const p = jwt.verify(token, segredo());
    if (typeof p !== 'object' || typeof p.sid !== 'string' || !UUID.test(p.sid)) return null;
    const sub = Number(p.sub);
    return Number.isInteger(sub) && sub > 0 ? { sub, sid: p.sid } : null;
  } catch {
    return null;
  }
}

/** Abre uma sessão para o usuário e devolve os tokens. */
export async function criar(usuarioId: number, meta: MetaSessao = {}): Promise<TokensSessao> {
  const refresh = novoRefresh();
  const [s] = await db<{ id: string }[]>`
    INSERT INTO sessao (usuario_id, refresh_hash, expira_em, user_agent, ip)
    VALUES (${usuarioId}, ${hash(refresh)}, now() + make_interval(secs => ${REFRESH_TTL_SEG}),
            ${meta.userAgent?.slice(0, 300) ?? null}, ${meta.ip?.slice(0, 64) ?? null})
    RETURNING id
  `;
  return { sid: s.id, refresh, access: assinarAccess(usuarioId, s.id) };
}

/** Papel atual do usuário se a sessão estiver ativa (não revogada, não expirada, usuário ativo). */
export async function papelDaSessaoAtiva(sid: string, usuarioId: number): Promise<Papel | null> {
  if (!UUID.test(sid)) return null;
  const [r] = await db<{ papel: Papel }[]>`
    SELECT u.papel
    FROM sessao s
    JOIN usuario u ON u.id = s.usuario_id
    WHERE s.id = ${sid} AND s.usuario_id = ${usuarioId}
      AND s.revogada_em IS NULL AND s.expira_em > now() AND u.ativo
  `;
  return r?.papel ?? null;
}

/** Troca o refresh token por um novo (rotação) e emite novo access. `null` se inválido. */
export async function renovar(refresh: string): Promise<(TokensSessao & { usuarioId: number }) | null> {
  if (!refresh) return null;
  const novo = novoRefresh();
  const [s] = await db<{ id: string; usuario_id: number }[]>`
    UPDATE sessao s SET
      refresh_hash = ${hash(novo)},
      ultimo_uso_em = now(),
      expira_em = now() + make_interval(secs => ${REFRESH_TTL_SEG})
    FROM usuario u
    WHERE s.refresh_hash = ${hash(refresh)}
      AND u.id = s.usuario_id AND u.ativo
      AND s.revogada_em IS NULL AND s.expira_em > now()
    RETURNING s.id, s.usuario_id
  `;
  if (!s) return null;
  return { sid: s.id, usuarioId: s.usuario_id, refresh: novo, access: assinarAccess(s.usuario_id, s.id) };
}

export async function revogar(sid: string): Promise<void> {
  if (!UUID.test(sid)) return;
  await db`UPDATE sessao SET revogada_em = now() WHERE id = ${sid} AND revogada_em IS NULL`;
}

export async function revogarPorRefresh(refresh: string): Promise<void> {
  if (!refresh) return;
  await db`UPDATE sessao SET revogada_em = now() WHERE refresh_hash = ${hash(refresh)} AND revogada_em IS NULL`;
}

/** Revoga todas as sessões do usuário (opcionalmente mantendo a atual). */
export async function revogarTodas(usuarioId: number, excetoSid?: string, tx: Executor = db): Promise<void> {
  await tx`
    UPDATE sessao SET revogada_em = now()
    WHERE usuario_id = ${usuarioId} AND revogada_em IS NULL
      AND id IS DISTINCT FROM ${excetoSid && UUID.test(excetoSid) ? excetoSid : null}::uuid
  `;
}
