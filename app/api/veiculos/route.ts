import { NextRequest, NextResponse } from "next/server";
import { buildOldPriceLabelFromOfficialPrice } from "@/utils/pricing";

const WP_BASE_URL = (process.env.WP_BASE_URL?.trim() || "http://localhost/savol-seminovos-local").replace(/\/+$/, "");
const VEICULO_ENDPOINT = `${WP_BASE_URL}/wp-json/wp/v2/veiculo`;
const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 200;
const WP_PAGE_SIZE = 100;
const FALLBACK_IMAGE = "/images/em-preparacao.jpg";
const API_CACHE_TTL_MS = 2 * 60 * 1000;
const WP_DEFAULT_USER = "fa.rubens@gmail.com";
const WP_DEFAULT_APP_PASSWORD = "W9y4 bUld QOIG PV4u oIHo csrb";

type WpMedia = {
  id: number;
  source_url?: string;
  media_details?: {
    sizes?: Record<string, { source_url?: string }>;
  };
};

type WpTerm = {
  id: number;
  name?: string;
  taxonomy?: string;
};

type WpVehicle = {
  id: number;
  slug?: string;
  link?: string;
  title?: { raw?: string; rendered?: string };
  content?: { raw?: string; rendered?: string };
  excerpt?: { raw?: string; rendered?: string };
  all_meta?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  _embedded?: {
    "wp:featuredmedia"?: WpMedia[];
    "wp:term"?: WpTerm[][];
  };
};

type ApiVehicle = {
  id: number;
  slug: string;
  url: string;
  name: string;
  subtitle: string;
  image: string;
  gallery: string[];
  year: string;
  transmission: string;
  fuel: string;
  km: string;
  store: string;
  oldPrice: string;
  price: string;
  qualityTag: string;
  secondaryHighlights: string[];
  brand: string;
  model: string;
  version: string;
  color: string;
  city: string;
  uf: string;
  molicar?: string;
  plate?: string;
};

type CachedVehicles = {
  items: ApiVehicle[];
  expiresAt: number;
};

let vehiclesCache: CachedVehicles | null = null;
let vehiclesInFlight: Promise<ApiVehicle[]> | null = null;

const TITLE_YEAR_REGEX = /\b((?:19|20)\d{2})(?:\s*[/-]\s*((?:19|20)\d{2}))?\b/;
const CONTENT_YEAR_REGEX = /\bano[:\s]+((?:19|20)\d{2})(?:\s*[/-]\s*((?:19|20)\d{2}))?/i;
const KM_REGEX = /\b(\d{1,3}(?:[.\s]\d{3})+|\d{2,6})\s*km\b/i;
const PRICE_REGEX = /(?:de\s*)?r\$\s*([\d.]+(?:,\d{2})?)/i;

export const dynamic = "force-dynamic";

function toInt(value: string | null | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&#8211;", "-")
    .replaceAll("&#8217;", "'")
    .replaceAll("&#8216;", "'")
    .replaceAll("&#038;", "&")
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function cleanText(value: string | undefined): string {
  if (!value) return "";
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function stripHtml(value: string | undefined): string {
  if (!value) return "";
  return cleanText(value.replace(/<[^>]*>/g, " "));
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

function getMetaField(vehicle: WpVehicle, key: string): string {
  const fromAllMeta = toMetaString(vehicle.all_meta?.[key]);
  if (fromAllMeta) return fromAllMeta;

  const fromMeta = toMetaString(vehicle.meta?.[key]);
  if (fromMeta) return fromMeta;

  return "";
}

function parseGalleryUrls(rawValue: string): string[] {
  if (!rawValue) return [];

  const isLikelyImageUrl = (value: string) => {
    if (!(value.startsWith("http://") || value.startsWith("https://"))) return false;
    return /(\.jpg|\.jpeg|\.png|\.webp|\.gif|\.avif)(\?.*)?$/i.test(value);
  };

  const urls = rawValue
    .split(/\r?\n/)
    .map((item) => encodeURI(cleanText(item)))
    .filter((item) => isLikelyImageUrl(item));
  return Array.from(new Set(urls)).slice(0, 12);
}

function normalizePlateValue(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
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

function getEmbeddedImage(vehicle: WpVehicle): string | null {
  const media = vehicle._embedded?.["wp:featuredmedia"]?.[0] ?? null;
  return pickImageFromMedia(media);
}

function getEmbeddedTerm(vehicle: WpVehicle, taxonomy: string): string {
  return getEmbeddedTerms(vehicle, taxonomy)[0] ?? "";
}

function getEmbeddedTerms(vehicle: WpVehicle, taxonomy: string): string[] {
  const groups = vehicle._embedded?.["wp:term"] ?? [];
  const terms: string[] = [];
  for (const group of groups) {
    for (const term of group) {
      if (term.taxonomy === taxonomy && term.name) {
        terms.push(cleanText(term.name));
      }
    }
  }
  return Array.from(new Set(terms.filter(Boolean)));
}

function getAuthHeaders(): HeadersInit {
  const user = process.env.WP_API_USER?.trim() || WP_DEFAULT_USER;
  const appPassword = process.env.WP_API_APP_PASSWORD?.trim() || WP_DEFAULT_APP_PASSWORD;
  if (!user || !appPassword) return {};

  const token = Buffer.from(`${user}:${appPassword}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ data: T | null; status: number }> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "SavolNext/1.0",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) return { data: null, status: response.status };
  return { data: (await response.json()) as T, status: response.status };
}

function buildVehicleUrl(perPage: number, options?: { context?: "edit"; embed?: boolean; page?: number }): string {
  const query = new URLSearchParams({ per_page: String(perPage) });
  if (options?.page) query.set("page", String(options.page));
  if (options?.embed) query.set("_embed", "wp:featuredmedia,wp:term");
  if (options?.context) query.set("context", options.context);
  return `${VEICULO_ENDPOINT}?${query.toString()}`;
}

function buildVehicleBySlugUrl(slug: string, options?: { context?: "edit"; embed?: boolean }): string {
  const query = new URLSearchParams({ slug });
  if (options?.embed) query.set("_embed", "wp:featuredmedia,wp:term");
  if (options?.context) query.set("context", options.context);
  query.set("per_page", "1");
  return `${VEICULO_ENDPOINT}?${query.toString()}`;
}

async function fetchVehiclePosts(perPage: number, authHeaders: HeadersInit): Promise<WpVehicle[]> {
  const rows: WpVehicle[] = [];
  const pageSize = Math.min(WP_PAGE_SIZE, perPage);
  const maxPages = Math.ceil(perPage / pageSize);

  const fetchPage = async (page: number, options?: { context?: "edit"; embed?: boolean }) => {
    const result = await fetchJson<WpVehicle[]>(buildVehicleUrl(pageSize, { ...options, page }), {
      headers: authHeaders
    });
    return Array.isArray(result.data) ? result.data : [];
  };

  const strategies: Array<{ context?: "edit"; embed?: boolean }> = Object.keys(authHeaders).length
    ? [{ context: "edit", embed: true }, { embed: true }, {}]
    : [{ embed: true }, {}];

  for (const strategy of strategies) {
    rows.length = 0;
    for (let page = 1; page <= maxPages; page += 1) {
      const pageRows = await fetchPage(page, strategy);
      if (!pageRows.length) break;
      rows.push(...pageRows);
      if (pageRows.length < pageSize || rows.length >= perPage) break;
    }
    if (rows.length) return rows.slice(0, perPage);
  }

  return [];
}

async function fetchVehicleBySlug(slug: string, authHeaders: HeadersInit): Promise<WpVehicle | null> {
  if (!slug) return null;

  if (Object.keys(authHeaders).length) {
    const editResult = await fetchJson<WpVehicle[]>(buildVehicleBySlugUrl(slug, { context: "edit", embed: true }), {
      headers: authHeaders
    });
    if (Array.isArray(editResult.data) && editResult.data.length) return editResult.data[0];
  }

  const embeddedViewResult = await fetchJson<WpVehicle[]>(buildVehicleBySlugUrl(slug, { embed: true }));
  if (Array.isArray(embeddedViewResult.data) && embeddedViewResult.data.length) return embeddedViewResult.data[0];

  const viewResult = await fetchJson<WpVehicle[]>(buildVehicleBySlugUrl(slug));
  if (Array.isArray(viewResult.data) && viewResult.data.length) return viewResult.data[0];

  return null;
}

function extractYear(title: string, content: string, metaAno: string, metaAnoModelo: string): string {
  if (metaAno && metaAnoModelo) return `${metaAno}/${metaAnoModelo}`;
  if (metaAno) return metaAno;
  if (metaAnoModelo) return metaAnoModelo;

  const fromTitle = title.match(TITLE_YEAR_REGEX);
  if (fromTitle) return fromTitle[2] ? `${fromTitle[1]}/${fromTitle[2]}` : fromTitle[1];

  const fromContent = content.match(CONTENT_YEAR_REGEX);
  if (fromContent) return fromContent[2] ? `${fromContent[1]}/${fromContent[2]}` : fromContent[1];

  return "Ano não informado";
}

function extractFuel(version: string, content: string, metaFuel: string): string {
  if (metaFuel) return cleanText(metaFuel);

  const source = normalizeForMatch(`${version} ${content}`);
  if (source.includes("flex")) return "Flex";
  if (source.includes("diesel")) return "Diesel";
  if (source.includes("gasolina")) return "Gasolina";
  if (source.includes("etanol")) return "Etanol";
  if (source.includes("hibrid")) return "Híbrido";
  if (source.includes("eletric")) return "Elétrico";
  return "Combustível não informado";
}

function extractTransmission(version: string, content: string, metaCambio: string): string {
  if (metaCambio) return cleanText(metaCambio);

  const source = normalizeForMatch(`${version} ${content}`);
  if (source.includes("cvt")) return "CVT";
  if (source.includes("automatic")) return "Automático";
  if (source.includes("manual")) return "Manual";
  if (/\bat\d?\b/.test(source)) return "Automático";
  if (/\bmt\d?\b/.test(source)) return "Manual";
  return "Câmbio não informado";
}

function formatKm(content: string, metaKm: string): string {
  if (metaKm) {
    const digits = metaKm.replace(/[^\d]/g, "");
    if (digits) return `${new Intl.NumberFormat("pt-BR").format(Number(digits))} km`;
  }

  const match = content.match(KM_REGEX);
  if (!match) return "KM não informado";

  const rawDigits = match[1].replace(/[^\d]/g, "");
  if (!rawDigits) return "KM não informado";

  return `${new Intl.NumberFormat("pt-BR").format(Number(rawDigits))} km`;
}

function toCurrencyValue(raw: string): string {
  const normalized = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return "";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(numeric);
}

function extractPriceData(content: string, metaPrice: string): { oldPrice: string; price: string } {
  if (metaPrice) {
    const formatted = toCurrencyValue(metaPrice);
    if (formatted) return { oldPrice: buildOldPriceLabelFromOfficialPrice(formatted), price: formatted };
  }

  const matches = [...content.matchAll(new RegExp(PRICE_REGEX, "gi"))];
  if (!matches.length) return { oldPrice: "", price: "Preço sob consulta" };

  const values = matches.map((match) => toCurrencyValue(match[0])).filter(Boolean);
  if (!values.length) return { oldPrice: "", price: "Preço sob consulta" };
  const officialPrice = values[values.length - 1];
  return { oldPrice: buildOldPriceLabelFromOfficialPrice(officialPrice), price: officialPrice };
}

function getQualityTag(content: string, condition: string): string {
  const source = normalizeForMatch(`${condition} ${content}`);
  if (source.includes("laudo")) return "Laudo aprovado";
  if (source.includes("seminovo")) return "Seminovo";
  if (source.includes("garantia")) return "Com garantia";
  return "Disponível";
}

function buildStoreLabel(value: string): string {
  if (!value) return "Unidade não informada";
  return value.replace(/\s*-\s*/g, " - ");
}

function parseBrandModelVersionFromTitle(title: string): { brand: string; model: string; version: string } {
  const cleaned = cleanText(title.replace(TITLE_YEAR_REGEX, "").trim());
  if (!cleaned) return { brand: "", model: "", version: "" };
  const parts = cleaned.split(" ").filter(Boolean);
  if (!parts.length) return { brand: "", model: "", version: "" };
  if (parts.length === 1) return { brand: parts[0], model: "", version: "" };
  if (parts.length === 2) return { brand: parts[0], model: parts[1], version: "" };
  return { brand: parts[0], model: parts[1], version: parts.slice(2).join(" ") };
}

function buildName(brand: string, model: string, version: string, title: string): string {
  if (brand && model) return version ? `${brand} ${model} ${version}`.trim() : `${brand} ${model}`.trim();
  return title || "Veículo sem título";
}

function buildSubtitle(version: string, model: string, excerpt: string): string {
  if (version) return version;
  if (model) return model;
  if (excerpt) return excerpt;
  return "Versão não informada";
}

function mapVehicle(vehicle: WpVehicle): ApiVehicle {
  const title = cleanText(vehicle.title?.rendered ?? vehicle.title?.raw);
  const content = stripHtml(vehicle.content?.raw ?? vehicle.content?.rendered);
  const excerpt = stripHtml(vehicle.excerpt?.raw ?? vehicle.excerpt?.rendered);

  const fallbackFromTitle = parseBrandModelVersionFromTitle(title);
  const brand = getEmbeddedTerm(vehicle, "veiculo_marca") || fallbackFromTitle.brand;
  const model = getEmbeddedTerm(vehicle, "veiculo_modelo") || fallbackFromTitle.model;
  const version = getEmbeddedTerm(vehicle, "veiculo_versao") || fallbackFromTitle.version;
  const color = getEmbeddedTerm(vehicle, "veiculo_cor");
  const city = getEmbeddedTerm(vehicle, "veiculo_cidade");
  const uf = getEmbeddedTerm(vehicle, "veiculo_uf");
  const store = getEmbeddedTerm(vehicle, "veiculo_unidade");
  const primaryHighlight = getEmbeddedTerm(vehicle, "veiculo_informacao_destaque");
  const secondaryHighlights = getEmbeddedTerms(vehicle, "veiculo_destaque_secundario");

  const metaAno = getMetaField(vehicle, "ano");
  const metaAnoModelo = getMetaField(vehicle, "ano_modelo");
  const metaKm = getMetaField(vehicle, "km");
  const metaPrice = getMetaField(vehicle, "preco");
  const metaFuel = getMetaField(vehicle, "combustivel");
  const metaCambio = getMetaField(vehicle, "cambio");
  const metaCondition = getMetaField(vehicle, "condicao");
  const metaGalleryUrls = getMetaField(vehicle, "autosync_photo_urls");
  const metaMolicar = getMetaField(vehicle, "molicar");
  const metaPlate = normalizePlateValue(getMetaField(vehicle, "placa") || getMetaField(vehicle, "plate"));
  const priceData = extractPriceData(content, metaPrice);

  const image = encodeURI(getEmbeddedImage(vehicle) ?? FALLBACK_IMAGE);
  const galleryFromMeta = parseGalleryUrls(metaGalleryUrls);
  const gallery = Array.from(new Set([image, ...galleryFromMeta].filter(Boolean)));

  return {
    id: vehicle.id,
    slug: vehicle.slug ?? String(vehicle.id),
    url: `/veiculos/${vehicle.slug ?? vehicle.id}`,
    name: buildName(brand, model, version, title),
    subtitle: buildSubtitle(version, model, excerpt),
    image,
    gallery: gallery.length ? gallery : [FALLBACK_IMAGE],
    year: extractYear(title, content, metaAno, metaAnoModelo),
    transmission: extractTransmission(version, content, metaCambio),
    fuel: extractFuel(version, content, metaFuel),
    km: formatKm(content, metaKm),
    store: buildStoreLabel(store),
    oldPrice: priceData.oldPrice,
    price: priceData.price,
    qualityTag: primaryHighlight,
    secondaryHighlights,
    brand: brand || "Marca não informada",
    model: model || "Modelo não informado",
    version: version || "Versão não informada",
    color: color || "Cor não informada",
    city: city || "Cidade não informada",
    uf: uf || "UF não informada",
    molicar: metaMolicar || "",
    plate: metaPlate || ""
  };
}

export async function GET(request: NextRequest) {
  const perPageInput = toInt(request.nextUrl.searchParams.get("per_page"), DEFAULT_PER_PAGE);
  const perPage = clamp(perPageInput, 1, MAX_PER_PAGE);
  const slug = cleanText(request.nextUrl.searchParams.get("slug") ?? "");

  try {
    if (slug) {
      if (vehiclesCache?.items?.length) {
        const fromCache = vehiclesCache.items.find((item) => item.slug === slug);
        if (fromCache) return NextResponse.json({ items: [fromCache] });
      }

      const authHeaders = getAuthHeaders();
      const row = await fetchVehicleBySlug(slug, authHeaders);
      if (!row) return NextResponse.json({ items: [] });
      return NextResponse.json({ items: [mapVehicle(row)] });
    }

    const now = Date.now();
    if (vehiclesCache && vehiclesCache.expiresAt > now) {
      return NextResponse.json({ items: vehiclesCache.items.slice(0, perPage) });
    }

    if (!vehiclesInFlight) {
      vehiclesInFlight = (async () => {
        const authHeaders = getAuthHeaders();
        const rows = await fetchVehiclePosts(MAX_PER_PAGE, authHeaders);
        if (!rows.length) return [];

        const items = rows.map(mapVehicle);
        vehiclesCache = {
          items,
          expiresAt: Date.now() + API_CACHE_TTL_MS
        };
        return items;
      })()
        .catch(() => vehiclesCache?.items ?? [])
        .finally(() => {
          vehiclesInFlight = null;
        });
    }

    const items = await vehiclesInFlight;
    return NextResponse.json({ items: items.slice(0, perPage) });
  } catch {
    return NextResponse.json({ items: vehiclesCache?.items.slice(0, perPage) ?? [] }, { status: 200 });
  }
}
