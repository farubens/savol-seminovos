import type { ApiVehicle } from "@/types/home";
import { parseCurrencyToInteger } from "@/utils/pricing";

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

function buildVehicleRow(vehicle: ApiVehicle, siteBaseUrl: string): string[] {
  const name = cleanFeedText(vehicle.name);
  const subtitle = cleanFeedText(vehicle.subtitle);
  const year = cleanFeedText(vehicle.year) || "N/A";
  const transmission = cleanFeedText(vehicle.transmission) || "N/A";
  const fuel = cleanFeedText(vehicle.fuel) || "N/A";
  const km = cleanFeedText(vehicle.km) || "N/A";
  const store = cleanFeedText(vehicle.store) || "N/A";
  const brand = cleanFeedText(vehicle.brand) || "N/A";
  const finalUrl = toAbsoluteUrl(vehicle.url || `/veiculos/${vehicle.slug}`, siteBaseUrl);
  const imageUrl = toAbsoluteUrl(vehicle.image, siteBaseUrl);
  const currentPrice = toFeedPrice(vehicle.price);
  const referencePrice = vehicle.repasse ? "" : toFeedPrice(vehicle.oldPrice);
  const hasSalePrice = Boolean(referencePrice && currentPrice && referencePrice !== currentPrice);
  const descriptionParts = [name, subtitle].filter(Boolean).join(" - ");
  const description = `${descriptionParts}. Ano: ${year}. Cambio: ${transmission}. Combustivel: ${fuel}. Quilometragem: ${km}. Loja: ${store}.`;
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
  const rows = [
    [...VEHICLE_CSV_HEADERS],
    ...vehicles.map((vehicle) => buildVehicleRow(vehicle, normalizedSiteUrl))
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n") + "\r\n";
}
