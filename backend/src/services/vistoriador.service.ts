// Vistoriadores = funcionários com papel 'vistoriador' (D1).
import db from '../config/db';

export interface Vistoriador {
  idvistoriador: number;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string | null;
  imagemdeperfil?: string | null;
}

export async function listar(): Promise<Vistoriador[]> {
  return db<Vistoriador[]>`
    SELECT f.id AS idvistoriador, f.nome, f.cpf
    FROM funcionario f
    JOIN usuario u ON u.id = f.id
    WHERE u.papel = 'vistoriador' AND u.ativo
    ORDER BY f.id DESC
  `;
}

export async function buscarPorId(id: unknown): Promise<Vistoriador | undefined> {
  const n = Number(id);
  if (!Number.isInteger(n)) return undefined;
  const [v] = await db<Vistoriador[]>`
    SELECT f.id AS idvistoriador, f.nome, f.cpf, u.email, f.telefone, f.imagemdeperfil
    FROM funcionario f
    JOIN usuario u ON u.id = f.id
    WHERE f.id = ${n} AND u.papel = 'vistoriador'
  `;
  return v;
}

/** Confere se o id é de um vistoriador ativo (usado ao atribuir vistorias). */
export async function ehVistoriadorAtivo(id: number): Promise<boolean> {
  const [r] = await db`SELECT 1 FROM usuario WHERE id = ${id} AND papel = 'vistoriador' AND ativo`;
  return Boolean(r);
}
