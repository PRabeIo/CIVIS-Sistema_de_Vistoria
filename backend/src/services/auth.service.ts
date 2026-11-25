import jwt, { type SignOptions } from 'jsonwebtoken';
import db from '../config/db';
import { CARGO_POR_PAPEL, type Cargo, type Papel } from '../domain/papel';
import type { UsuarioToken } from '../types/express';
import * as usuarioService from './usuario.service';

export interface UsuarioLogado {
  id: number;
  /** Mantido com este nome por compatibilidade com o frontend; é o papel. */
  tipo: Papel;
  cargo: Cargo;
  nome: string | null;
  email: string;
}

export type ResultadoLogin =
  | { token: string; usuario: UsuarioLogado; erro?: undefined }
  | { erro: string; status: number };

const CREDENCIAIS_INVALIDAS = { erro: 'Email ou senha inválidos.', status: 401 } as const;

export function assinarToken(id: number, papel: Papel): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado.');
  const payload: Pick<UsuarioToken, 'sub' | 'papel'> = { sub: id, papel };
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn });
}

async function buscarNome(id: number, papel: Papel): Promise<string | null> {
  const [p] =
    papel === 'cliente'
      ? await db<{ nome: string }[]>`SELECT nome FROM cliente WHERE idcliente = ${id}`
      : await db<{ nome: string }[]>`SELECT nome FROM funcionario WHERE id = ${id}`;
  return p?.nome ?? null;
}

/** Login em uma única tabela (D1). Mesma resposta para e-mail inexistente e senha errada. */
export async function autenticar(email: string, senha: string): Promise<ResultadoLogin> {
  const usuario = await usuarioService.buscarPorEmail(String(email).trim());
  if (!usuario) return CREDENCIAIS_INVALIDAS;

  const senhaOk = await usuarioService.conferirSenha(String(senha), usuario.senha_hash);
  if (!senhaOk) return CREDENCIAIS_INVALIDAS;

  if (!usuario.ativo) return { erro: 'Usuário desativado. Procure o administrador.', status: 403 };

  await usuarioService.registrarLogin(usuario.id);

  return {
    token: assinarToken(usuario.id, usuario.papel),
    usuario: {
      id: usuario.id,
      tipo: usuario.papel,
      cargo: CARGO_POR_PAPEL[usuario.papel],
      nome: await buscarNome(usuario.id, usuario.papel),
      email: usuario.email,
    },
  };
}
