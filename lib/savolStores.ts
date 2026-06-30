import { normalizeSavolContactText } from "@/lib/savolWhatsApp";

type StoreRule = {
  id: number;
  aliases: string[];
};

const SAVOL_TECHNICAL_STORE_RULES: StoreRule[] = [
  { id: 18882, aliases: ["savol volks santo andre", "savol volkswagen santo andre", "volkswagen santo andre", "volks santo andre"] },
  { id: 25815, aliases: ["savol toyota sao bernardo", "toyota sao bernardo"] },
  { id: 25817, aliases: ["savol toyota santo andre", "toyota santo andre", "toyota dom pedro"] },
  { id: 25820, aliases: ["savol toyota praia grande", "toyota praia grande"] },
  { id: 101181625, aliases: ["savol citroen peugeot santo andre", "citroen santo andre", "peugeot santo andre"] },
  { id: 101181626, aliases: ["savol citroen peugeot sao bernardo", "citroen sao bernardo", "peugeot sao bernardo"] },
  { id: 101199580, aliases: ["savol kia ipiranga", "kia ipiranga", "kia sao paulo"] },
  { id: 101199581, aliases: ["savol kia santo andre", "kia santo andre"] },
  { id: 101199584, aliases: ["savol fiat sao caetano", "fiat sao caetano"] },
  { id: 101199585, aliases: ["savol fiat santo andre", "fiat santo andre"] },
  { id: 101236779, aliases: ["savol fiat sao bernardo", "fiat sao bernardo"] },
  { id: 101252001, aliases: ["savol peugeot sao caetano", "peugeot sao caetano", "jetour", "mg motor", "mg"] }
];

const SAVOL_TECHNICAL_BRAND_FALLBACKS: StoreRule[] = [
  { id: 25817, aliases: ["toyota"] },
  { id: 18882, aliases: ["volkswagen", "volks", "vw"] },
  { id: 101181625, aliases: ["citroen", "citro"] },
  { id: 101181625, aliases: ["peugeot"] },
  { id: 101199585, aliases: ["fiat"] },
  { id: 101199581, aliases: ["kia"] },
  { id: 101252001, aliases: ["jetour", "mg motor", "mg"] }
];

function matchesAlias(normalized: string, alias: string): boolean {
  const normalizedAlias = normalizeSavolContactText(alias);
  return normalized.includes(normalizedAlias);
}

export function resolveSavolTechnicalStoreIdFromParts(parts: Array<string | null | undefined>): number | null {
  const normalized = normalizeSavolContactText(parts.filter(Boolean).join(" "));
  if (!normalized) return null;

  const exactStore = SAVOL_TECHNICAL_STORE_RULES.find((rule) => rule.aliases.some((alias) => matchesAlias(normalized, alias)));
  if (exactStore) return exactStore.id;

  const brandFallback = SAVOL_TECHNICAL_BRAND_FALLBACKS.find((rule) => rule.aliases.some((alias) => matchesAlias(normalized, alias)));
  return brandFallback?.id ?? null;
}
