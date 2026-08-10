export const VEHICLE_FALLBACK_IMAGE = "/images/fallback-atualizado.webp";

function normalizeImageReference(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Keep the original URL when it contains malformed escape sequences.
  }

  return decoded
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function isPreparationVehicleImageUrl(value: string): boolean {
  if (!value) return false;

  const normalized = normalizeImageReference(value);
  return (
    normalized.includes("imagesempreparacao") ||
    normalized.includes("imagesfallbackatualizado") ||
    normalized.includes("empreparacao") ||
    normalized.includes("empreparao") ||
    normalized.includes("preparacao") ||
    normalized.includes("prepacacao")
  );
}

export function getRealVehicleImageUrls(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).filter((value) => !isPreparationVehicleImageUrl(value));
}

export function getDisplayVehicleImageUrls(values: string[]): string[] {
  const realImages = getRealVehicleImageUrls(values);
  return realImages.length ? realImages : [VEHICLE_FALLBACK_IMAGE];
}
