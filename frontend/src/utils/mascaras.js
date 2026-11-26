// Máscaras de exibição/digitação. O backend aceita com ou sem máscara e guarda só os dígitos (S9).
const digitos = (v) => String(v ?? "").replace(/\D/g, "");

export function mascararCpf(v) {
  return digitos(v)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function mascararTelefone(v) {
  const d = digitos(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/^(\d{2})(\d{5})(\d)/, "($1) $2-$3");
}
