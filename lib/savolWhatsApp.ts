const DEFAULT_WHATSAPP_PHONE = "(11) 4435-1000";

const BRAND_WHATSAPP_PHONES: Array<{ aliases: string[]; phone: string }> = [
  { aliases: ["toyota"], phone: "(11) 4979-6000" },
  { aliases: ["volkswagen", "volks", "vw"], phone: "(11) 4435-1000" },
  { aliases: ["peugeot"], phone: "(11) 3381-1005" },
  { aliases: ["citroen", "citro", "citroen"], phone: "(11) 3381-1005" },
  { aliases: ["fiat"], phone: "(11) 3319-1000" },
  { aliases: ["kia"], phone: "(11) 4331-1000" },
  { aliases: ["mg", "mg motor"], phone: "(11) 3809-1010" },
  { aliases: ["jetour"], phone: "(11) 3319-1010" }
];

function findSavolWhatsAppPhone(value: string): string | null {
  const normalized = normalizeSavolContactText(value);
  const match = BRAND_WHATSAPP_PHONES.find((item) => item.aliases.some((alias) => normalized.includes(alias)));

  return match?.phone ?? null;
}

export function normalizeSavolContactText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveSavolWhatsAppPhone(value: string): string {
  return findSavolWhatsAppPhone(value) ?? DEFAULT_WHATSAPP_PHONE;
}

export function resolveSavolWhatsAppPhoneFromParts(parts: Array<string | null | undefined>): string {
  for (const part of parts) {
    const phone = findSavolWhatsAppPhone(part ?? "");
    if (phone) return phone;
  }

  return DEFAULT_WHATSAPP_PHONE;
}
