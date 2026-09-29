import type { ApiVehicle } from "@/types/home";
import { parseCurrencyToInteger } from "@/utils/pricing";
import { getRealVehicleImageUrls } from "@/lib/vehicleImages";

export const VEHICLE_CSV_HEADERS = [
  "ID",
  "ID2",
  "Item title",
  "Final URL",
  "Image URL",
  "Item subtitle",
  "Item description",
  "Price",
  "Sale price",
  "Item category",
  "Contextual keywords"
] as const;

function cleanFeedText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

const LOWERCASE_TITLE_WORDS = new Set(["a", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "o", "os"]);
const VEHICLE_ACRONYMS = new Set(["AT", "CVT", "DCT", "EV", "EX", "GTI", "HEV", "LT", "LTZ", "MT", "RS", "SUV", "SRV", "SRX", "TDI", "TSI", "XL", "XLS", "XLT", "XR", "XRE"]);

function toNaturalTitle(value: string): string {
  return cleanFeedText(value)
    .split(" ")
    .map((word, index) => {
      const normalized = word.toLocaleUpperCase("pt-BR");
      const plainWord = normalized.replace(/^[^A-ZÀ-Ü0-9]+|[^A-ZÀ-Ü0-9]+$/g, "");
      const lowercaseWord = plainWord.toLocaleLowerCase("pt-BR");

      if (/\d/.test(plainWord) || VEHICLE_ACRONYMS.has(plainWord) || (plainWord.length <= 2 && plainWord === normalized)) {
        return normalized;
      }

      if (index > 0 && LOWERCASE_TITLE_WORDS.has(lowercaseWord)) {
        return word.toLocaleLowerCase("pt-BR");
      }

      const lowered = word.toLocaleLowerCase("pt-BR");
      return lowered.charAt(0).toLocaleUpperCase("pt-BR") + lowered.slice(1);
    })
    .join(" ");
}

function normalizeTransmission(value: string): string {
  const normalized = cleanFeedText(value).toLocaleUpperCase("pt-BR").replace(/\./g, "");
  if (["AUT", "AUTOMATICO", "AUTOMÁTICO"].includes(normalized)) return "Automático";
  if (["MAN", "MANUAL"].includes(normalized)) return "Manual";
  if (["CVT", "DCT"].includes(normalized)) return normalized;
  return toNaturalTitle(value) || "N/A";
}

function normalizeFuel(value: string): string {
  const normalized = cleanFeedText(value).toLocaleUpperCase("pt-BR");
  const labels: Record<string, string> = {
    ALCOOL: "Álcool",
    ÁLCOOL: "Álcool",
    DIESEL: "Diesel",
    ELETRICO: "Elétrico",
    ELÉTRICO: "Elétrico",
    FLEX: "Flex",
    GASOLINA: "Gasolina",
    GNV: "GNV",
    HIBRIDO: "Híbrido",
    HÍBRIDO: "Híbrido"
  };

  return labels[normalized] || toNaturalTitle(value) || "N/A";
}

function toAbsoluteUrl(value: string, siteBaseUrl: string): string {
  const cleaned = value.trim();
  if (!cleaned) return "";

  try {
    return new URL(cleaned, `${siteBaseUrl}/`).toString();
  } catch {
    return "";
  }
}

function toFeedPrice(value: string): string {
  const parsed = parseCurrencyToInteger(value);
  return parsed && parsed > 0 ? `${parsed.toFixed(2)} BRL` : "";
}

function getModelYear(year: string): string {
  const matches = year.match(/\b(?:19|20)\d{2}\b/g);
  return matches?.at(-1) ?? cleanFeedText(year);
}

function escapeCsvCell(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function buildVehicleRow(vehicle: ApiVehicle, siteBaseUrl: string): string[] | null {
  const name = toNaturalTitle(vehicle.name);
  const subtitle = toNaturalTitle(vehicle.subtitle);
  const year = cleanFeedText(vehicle.year) || "N/A";
  const transmission = normalizeTransmission(vehicle.transmission);
  const fuel = normalizeFuel(vehicle.fuel);
  const km = cleanFeedText(vehicle.km) || "N/A";
  const store = toNaturalTitle(vehicle.store) || "N/A";
  const brand = toNaturalTitle(vehicle.brand) || "N/A";
  const finalUrl = toAbsoluteUrl(vehicle.url || `/veiculos/${vehicle.slug}`, siteBaseUrl);
  const imageUrl = getRealVehicleImageUrls([vehicle.image, ...(vehicle.gallery || [])])
    .map((image) => toAbsoluteUrl(image, siteBaseUrl))
    .find(Boolean);
  if (!imageUrl) return null;

  const currentPrice = toFeedPrice(vehicle.price);
  const referencePrice = vehicle.repasse ? "" : toFeedPrice(vehicle.oldPrice);
  const hasSalePrice = Boolean(referencePrice && currentPrice && referencePrice !== currentPrice);
  const descriptionParts = [name, subtitle].filter(Boolean).join(", ");
  const description = `${descriptionParts}. Ano: ${year}. Câmbio: ${transmission}. Combustível: ${fuel}. Quilometragem: ${km}. Loja: ${store}.`;
  const contextualKeywords = [brand, transmission, fuel, getModelYear(year)].filter(Boolean).join(";");

  return [
    cleanFeedText(vehicle.slug) || String(vehicle.id),
    "",
    name,
    finalUrl,
    imageUrl,
    `${transmission} | ${fuel} | ${km} | Usado`,
    description,
    hasSalePrice ? referencePrice : currentPrice,
    hasSalePrice ? currentPrice : "",
    brand,
    contextualKeywords
  ];
}

export function buildVehicleCsvFeed(vehicles: ApiVehicle[], siteBaseUrl: string): string {
  const normalizedSiteUrl = siteBaseUrl.replace(/\/+$/, "");
  const vehicleRows = vehicles
    .map((vehicle) => buildVehicleRow(vehicle, normalizedSiteUrl))
    .filter((row): row is string[] => row !== null);
  const rows = [
    [...VEHICLE_CSV_HEADERS],
    ...vehicleRows
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n") + "\r\n";
}
