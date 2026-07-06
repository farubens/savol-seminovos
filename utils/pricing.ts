export function parseCurrencyToNumber(value: string): number | null {
  if (!value) return null;
  const parsed = parseCurrencyToInteger(value);
  return parsed && parsed > 0 ? parsed : null;
}

export function parseCurrencyToInteger(value: string): number | null {
  const text = value.replace(/[^\d,.-]/g, "").trim();
  if (!text) return null;

  let normalized = text;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+(\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
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
