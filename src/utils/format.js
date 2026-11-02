export const money = (value) => new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL"
}).format(Number(value) || 0);

export const number = (value, digits = 2) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: digits, maximumFractionDigits: digits
}).format(Number(value) || 0);
