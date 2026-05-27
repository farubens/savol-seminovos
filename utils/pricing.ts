export function parseCurrencyToNumber(value: string): number | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
}

export function buildReferencePriceValue(officialPrice: number): number {
  const target = officialPrice * 1.03;
  let rounded = Math.floor(target / 1000) * 1000 + 900;
  if (rounded < target) rounded += 1000;
  return Math.round(rounded);
}

export function buildOldPriceLabelFromOfficialPrice(officialPriceLabel: string): string {
  const officialValue = parseCurrencyToNumber(officialPriceLabel);
  if (!officialValue) return "";
  const referenceValue = buildReferencePriceValue(officialValue);
  return `De ${formatCurrencyBRL(referenceValue)}`;
}
