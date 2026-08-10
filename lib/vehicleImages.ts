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
  const seen = new Set<string>();
  const images: string[] = [];

  for (const value of values.filter(Boolean)) {
    if (isPreparationVehicleImageUrl(value)) continue;

    const identity = value.toLowerCase().match(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/)?.[0] ?? value;
    if (seen.has(identity)) continue;

    seen.add(identity);
    images.push(value);
  }

  return images;
}

export function getDisplayVehicleImageUrls(values: string[]): string[] {
  const realImages = getRealVehicleImageUrls(values);
  return realImages.length ? realImages : [VEHICLE_FALLBACK_IMAGE];
}
