import { NextRequest, NextResponse } from "next/server";

const DEFAULT_WP_BASE_URL =
  process.env.NODE_ENV === "production" ? "https://palevioletred-lark-270684.hostingersite.com" : "http://localhost/savol-seminovos-local";
const WP_BASE_URL = (process.env.WP_BASE_URL?.trim() || DEFAULT_WP_BASE_URL).replace(/\/+$/, "");
const VEICULO_ENDPOINT = `${WP_BASE_URL}/wp-json/wp/v2/veiculo`;
const MEDIA_ENDPOINT = `${WP_BASE_URL}/wp-json/wp/v2/media`;
const GALLERY_TTL_MS = 5 * 60 * 1000;
const WP_DEFAULT_USER = "fa.rubens@gmail.com";
const WP_DEFAULT_APP_PASSWORD = "W9y4 bUld QOIG PV4u oIHo csrb";

type WpMedia = {
  id: number;
  source_url?: string;
  media_details?: {
    sizes?: Record<string, { source_url?: string }>;
  };
};

type WpVehicleSingle = {
  id: number;
  featured_media?: number;
  meta?: Record<string, unknown>;
  all_meta?: Record<string, unknown>;
  _embedded?: {
    "wp:featuredmedia"?: WpMedia[];
  };
};

type CachedGallery = {
  items: string[];
  expiresAt: number;
};

const galleryCache = new Map<number, CachedGallery>();
const galleryInFlight = new Map<number, Promise<string[]>>();

export const dynamic = "force-dynamic";

function getAuthHeaders(): HeadersInit {
  const user = process.env.WP_API_USER?.trim() || WP_DEFAULT_USER;
  const appPassword = process.env.WP_API_APP_PASSWORD?.trim() || WP_DEFAULT_APP_PASSWORD;
  if (!user || !appPassword) return {};

  const token = Buffer.from(`${user}:${appPassword}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ data: T | null; status: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "SavolNext/1.0",
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      return { data: null, status: response.status };
    }

    return { data: (await response.json()) as T, status: response.status };
  } catch {
    return { data: null, status: 0 };
  } finally {
    clearTimeout(timeoutId);
  }
}

function toMetaString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (Array.isArray(value)) return toMetaString(value[0]);
  if (typeof value === "object") {
    const rendered = (value as { rendered?: unknown }).rendered;
    if (rendered != null) return toMetaString(rendered);
  }
  return "";
}

function getMetaField(vehicle: WpVehicleSingle, key: string): string {
  const fromAllMeta = toMetaString(vehicle.all_meta?.[key]);
  if (fromAllMeta) return fromAllMeta;

  const fromMeta = toMetaString(vehicle.meta?.[key]);
  if (fromMeta) return fromMeta;

  return "";
}

function parseGalleryIds(rawValue: string): number[] {
  if (!rawValue) return [];
  return Array.from(
    new Set(
      rawValue
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0)
    )
  ).slice(0, 24);
}

function parseGalleryUrls(rawValue: string): string[] {
  if (!rawValue) return [];

  const isLikelyImageUrl = (value: string) => {
    if (!(value.startsWith("http://") || value.startsWith("https://"))) return false;
    return /(\.jpg|\.jpeg|\.png|\.webp|\.gif|\.avif)(\?.*)?$/i.test(value);
  };

  return Array.from(
    new Set(
      rawValue
        .split(/\r?\n/)
        .map((value) => encodeURI(value.trim()))
        .filter((value) => isLikelyImageUrl(value))
    )
  ).slice(0, 24);
}

function pickImageFromMedia(media: WpMedia | null): string | null {
  if (!media) return null;
  const sizeCandidates = ["large", "medium_large", "medium", "thumbnail"];
  for (const sizeKey of sizeCandidates) {
    const url = media.media_details?.sizes?.[sizeKey]?.source_url;
    if (url) return url;
  }
  return media.source_url ?? null;
}

function getEmbeddedFeaturedImage(vehicle: WpVehicleSingle): string | null {
  const media = vehicle._embedded?.["wp:featuredmedia"]?.[0] ?? null;
  return pickImageFromMedia(media);
}

function buildVehicleUrl(id: number, options?: { context?: "edit"; embed?: boolean }): string {
  const query = new URLSearchParams();
  if (options?.embed) query.set("_embed", "wp:featuredmedia");
  if (options?.context) query.set("context", options.context);
  const suffix = query.toString();
  return `${VEICULO_ENDPOINT}/${id}${suffix ? `?${suffix}` : ""}`;
}

async function fetchVehicle(id: number, authHeaders: HeadersInit): Promise<WpVehicleSingle | null> {
  if (Object.keys(authHeaders).length) {
    const editResult = await fetchJson<WpVehicleSingle>(buildVehicleUrl(id, { context: "edit", embed: true }), {
      headers: authHeaders
    });
    if (editResult.data) return editResult.data;
  }

  const embeddedViewResult = await fetchJson<WpVehicleSingle>(buildVehicleUrl(id, { embed: true }));
  if (embeddedViewResult.data) return embeddedViewResult.data;

  const viewResult = await fetchJson<WpVehicleSingle>(buildVehicleUrl(id));
  return viewResult.data;
}

async function fetchMediaByIds(ids: number[], authHeaders: HeadersInit): Promise<WpMedia[]> {
  if (!ids.length) return [];
  const query = new URLSearchParams({
    include: ids.join(","),
    per_page: String(Math.max(24, ids.length)),
    orderby: "include"
  });
  const result = await fetchJson<WpMedia[]>(`${MEDIA_ENDPOINT}?${query.toString()}`, { headers: authHeaders });
  return Array.isArray(result.data) ? result.data : [];
}

async function resolveGalleryByVehicleId(id: number): Promise<string[]> {
  const authHeaders = getAuthHeaders();
  const vehicle = await fetchVehicle(id, authHeaders);
  if (!vehicle) return [];

  const featuredImage = getEmbeddedFeaturedImage(vehicle);
  const featuredId = Number(vehicle.featured_media ?? 0);
  const galleryIds = parseGalleryIds(getMetaField(vehicle, "galeria_fotos"));
  const mediaIds = Array.from(new Set([featuredId, ...galleryIds].filter((value) => value > 0)));

  const mediaRows = await fetchMediaByIds(mediaIds, authHeaders);
  const imageById = new Map<number, string>();
  for (const media of mediaRows) {
    const picked = pickImageFromMedia(media);
    if (picked) imageById.set(media.id, picked);
  }

  const orderedMediaUrls = mediaIds.map((mediaId) => imageById.get(mediaId) ?? "").filter(Boolean).map((value) => encodeURI(value));
  const fromAutosyncUrls = parseGalleryUrls(getMetaField(vehicle, "autosync_photo_urls"));
  const trustedPool = orderedMediaUrls.length > 1 ? orderedMediaUrls : [...orderedMediaUrls, ...fromAutosyncUrls];
  const merged = Array.from(new Set([featuredImage ? encodeURI(featuredImage) : "", ...trustedPool].filter(Boolean)));
  return merged;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ gallery: [] as string[] }, { status: 400 });
  }

  const cached = galleryCache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ gallery: cached.items });
  }

  if (!galleryInFlight.has(id)) {
    const promise = resolveGalleryByVehicleId(id)
      .then((items) => {
        galleryCache.set(id, {
          items,
          expiresAt: Date.now() + GALLERY_TTL_MS
        });
        return items;
      })
      .catch(() => cached?.items ?? [])
      .finally(() => {
        galleryInFlight.delete(id);
      });

    galleryInFlight.set(id, promise);
  }

  const gallery = await galleryInFlight.get(id);
  return NextResponse.json({ gallery: gallery ?? [] });
}
