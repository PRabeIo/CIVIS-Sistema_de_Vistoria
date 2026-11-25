// Papel do usuário (DEC-1). Mesma lista do CHECK `usuario_papel_chk` no banco.
export const PAPEIS = ['admin', 'vistoriador', 'cliente'] as const;
export type Papel = (typeof PAPEIS)[number];

export type PapelFuncionario = Exclude<Papel, 'cliente'>;

/** Rótulo exibido no frontend (compatível com o antigo campo `cargo`). */
export type Cargo = 'Administrador' | 'Vistoriador' | 'Cliente';

export const CARGO_POR_PAPEL: Record<Papel, Cargo> = {
  admin: 'Administrador',
  vistoriador: 'Vistoriador',
  cliente: 'Cliente',
};

const PAPEL_POR_CARGO: Record<string, PapelFuncionario> = {
  Administrador: 'admin',
  Vistoriador: 'vistoriador',
};

/** Converte o `cargo` enviado pelo frontend ("Administrador" | "Vistoriador") em papel. */
export function papelDoCargo(cargo: unknown): PapelFuncionario | null {
  return typeof cargo === 'string' ? (PAPEL_POR_CARGO[cargo] ?? null) : null;
}

export function isPapel(valor: unknown): valor is Papel {
  return typeof valor === 'string' && (PAPEIS as readonly string[]).includes(valor);
}
