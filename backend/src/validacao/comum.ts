// S9: regras de validação e normalização reutilizadas por todos os schemas.
import { z } from 'zod';
import { AppError } from '../domain/erros';

export const SENHA_MIN = 8;

const soDigitos = (v: string) => v.replace(/\D/g, '');

/** Valida CPF pelos dígitos verificadores. Recebe só dígitos. */
export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(cpf.slice(0, 9)) === Number(cpf[9]) && dv(cpf.slice(0, 10)) === Number(cpf[10]);
}

/** Campos de formulário multipart chegam como "" quando vazios: trata como ausente. */
const vazioParaUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/** Torna um campo opcional aceitando "" como ausente. */
export const opcional = <T extends z.ZodType>(schema: T) => z.preprocess(vazioParaUndefined, schema.optional());

export const texto = (rotulo: string, max = 150) =>
  z
    .string({ error: `${rotulo} é obrigatório.` })
    .trim()
    .min(1, { error: `${rotulo} é obrigatório.` })
    .max(max, { error: `${rotulo} deve ter no máximo ${max} caracteres.` });

/** CPF: aceita com ou sem máscara, valida os dígitos e devolve só os 11 dígitos. */
export const cpf = z
  .string({ error: 'CPF é obrigatório.' })
  .transform(soDigitos)
  .refine(cpfValido, { error: 'CPF inválido.' });

/** E-mail: trim + minúsculas. */
export const email = z
  .string({ error: 'E-mail é obrigatório.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'E-mail inválido.' }).max(150, { error: 'E-mail muito longo.' }));

/** Telefone BR: 10 ou 11 dígitos (com DDD); devolve só dígitos. */
export const telefone = z
  .string()
  .transform(soDigitos)
  .refine((v) => v.length === 10 || v.length === 11, { error: 'Telefone inválido. Use DDD + número.' });

/** Política única de senha: mínimo 8 caracteres, com letra e número. */
export const senha = z
  .string({ error: 'Senha é obrigatória.' })
  .min(SENHA_MIN, { error: `A senha deve ter pelo menos ${SENHA_MIN} caracteres.` })
  .max(72, { error: 'A senha deve ter no máximo 72 caracteres.' }) // limite do bcrypt
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), { error: 'A senha deve conter letras e números.' });

/** Id numérico positivo vindo de params/query/body (string ou número). */
export const id = (rotulo = 'ID') =>
  z.coerce
    .number({ error: `${rotulo} inválido.` })
    .int({ error: `${rotulo} inválido.` })
    .positive({ error: `${rotulo} inválido.` });

export const paramsId = (campo: string, rotulo = 'ID') => z.object({ [campo]: id(rotulo) });

/** Faz o parse e, se falhar, lança AppError 400 com a primeira mensagem e os erros por campo. */
export function validar<T extends z.ZodType>(schema: T, dados: unknown): z.output<T> {
  const r = schema.safeParse(dados ?? {});
  if (r.success) return r.data;

  const campos: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const chave = issue.path.join('.') || '_';
    campos[chave] ??= issue.message;
  }
  throw new AppError(400, 'VALIDACAO', r.error.issues[0]?.message ?? 'Dados inválidos.', campos);
}
