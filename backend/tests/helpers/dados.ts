// Geradores de dados válidos para os testes (S9 exige CPF com dígito verificador).
const dv = (base: string) => {
  let soma = 0;
  for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
};

// Cada arquivo de teste roda isolado: começar de um ponto aleatório evita CPFs repetidos entre arquivos.
let contador = 100_000_000 + Math.floor(Math.random() * 800_000_000);

/** Gera um CPF válido e único na execução (só dígitos). */
export function gerarCpf(): string {
  const base = String(contador++).padStart(9, '0');
  const d1 = dv(base);
  return base + d1 + dv(base + d1);
}

/** Formata 11 dígitos como 000.000.000-00 (para testar entrada com máscara). */
export const comMascara = (cpf: string) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

let n = 0;
/** E-mail único na execução. */
export const gerarEmail = (prefixo = 'teste') => `${prefixo}.${Date.now()}.${n++}@civis.test`;
