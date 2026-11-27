// S11: regras de LGPD compartilhadas.

/** Versão vigente dos termos de uso e da política de privacidade (mudar junto com as páginas do frontend). */
export const TERMOS_VERSAO = '2026-11';

/** Mascara CPF para listagens: "12345678901" → "***.456.789-**". Outros valores (ex.: anonimizados) viram "-". */
export function mascararCpf(cpf: unknown): string {
  const d = String(cpf ?? '').replace(/\D/g, '');
  if (d.length !== 11 || /^anon/i.test(String(cpf))) return '-';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/** Aplica a máscara no campo `campo` de cada linha (sem alterar o original). */
export function comCpfMascarado<T extends Record<string, unknown>>(linhas: T[], campo = 'cpf'): T[] {
  return linhas.map((l) => ({ ...l, [campo]: mascararCpf(l[campo]) }));
}
