import { NextRequest, NextResponse } from "next/server";

const WP_BASE_URL = "https://palevioletred-lark-270684.hostingersite.com";
const VEICULO_ENDPOINT = `${WP_BASE_URL}/wp-json/wp/v2/veiculo`;
const MEDIA_ENDPOINT = `${WP_BASE_URL}/wp-json/wp/v2/media`;
const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 24;
const FALLBACK_IMAGE = "/images/hero-car.png";

const TAXONOMIES = [
  "veiculo_marca",
  "veiculo_modelo",
  "veiculo_versao",
  "veiculo_cor",
  "veiculo_cidade",
  "veiculo_uf",
  "veiculo_unidade"
] as const;

const VEHICLE_FIELDS = [
  "id",
  "title",
  "slug",
  "link",
  "content",
  "excerpt",
  "featured_media",
  "veiculo_marca",
  "veiculo_modelo",
  "veiculo_versao",
  "veiculo_cor",
  "veiculo_cidade",
  "veiculo_uf",
  "veiculo_unidade",
  "all_meta",
  "meta"
].join(",");

type TaxonomyName = (typeof TAXONOMIES)[number];

type WpVehicle = {
  id: number;
  slug?: string;
  link?: string;
  featured_media?: number;
  title?: {
    raw?: string;
    rendered?: string;
  };
  content?: {
    raw?: string;
    rendered?: string;
  };
  excerpt?: {
    raw?: string;
    rendered?: string;
  };
  veiculo_marca?: number[];
  veiculo_modelo?: number[];
  veiculo_versao?: number[];
  veiculo_cor?: number[];
  veiculo_cidade?: number[];
  veiculo_uf?: number[];
  veiculo_unidade?: number[];
  all_meta?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

type WpTaxonomyTerm = {
  id: number;
  name?: string;
};

type WpMedia = {
  id: number;
  source_url?: string;
  media_details?: {
    sizes?: Record<string, { source_url?: string }>;
  };
};

type ApiVehicle = {
  id: number;
  slug: string;
  url: string;
  name: string;
  subtitle: string;
  image: string;
  year: string;
  transmission: string;
  fuel: string;
  km: string;
  store: string;
  oldPrice: string;
  price: string;
  qualityTag: string;
  brand: string;
  model: string;
  version: string;
  color: string;
  city: string;
  uf: string;
};

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

function getAuthHeaders(): HeadersInit {
  const user = process.env.WP_API_USER?.trim();
  const appPassword = process.env.WP_API_APP_PASSWORD?.trim();
  if (!user || !appPassword) return {};

  const token = Buffer.from(`${user}:${appPassword}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

function buildVehicleUrl(perPage: number, context?: "edit"): string {
  const query = new URLSearchParams({
    per_page: String(perPage),
    _fields: VEHICLE_FIELDS
  });
  if (context) {
    query.set("context", context);
  }
  return `${VEICULO_ENDPOINT}?${query.toString()}`;
}

async function fetchVehiclePosts(perPage: number, authHeaders: HeadersInit): Promise<WpVehicle[]> {
  if (Object.keys(authHeaders).length) {
    const editRows = await fetchJson<WpVehicle[]>(buildVehicleUrl(perPage, "edit"), { headers: authHeaders });
    if (Array.isArray(editRows) && editRows.length) {
      return editRows;
    }
  }

  const viewRows = await fetchJson<WpVehicle[]>(buildVehicleUrl(perPage));
  if (Array.isArray(viewRows)) {
    return viewRows;
  }

  return [];
}

async function fetchTaxonomyLookup(taxonomy: TaxonomyName): Promise<Map<number, string>> {
  const query = new URLSearchParams({
    per_page: "100",
    hide_empty: "false",
    _fields: "id,name"
  });
  const url = `${WP_BASE_URL}/wp-json/wp/v2/${taxonomy}?${query.toString()}`;
  const terms = await fetchJson<WpTaxonomyTerm[]>(url);
  const lookup = new Map<number, string>();

  for (const term of terms ?? []) {
    lookup.set(term.id, cleanText(term.name));
  }

  return lookup;
}

async function fetchTaxonomiesLookup(): Promise<Record<TaxonomyName, Map<number, string>>> {
  const results = await Promise.all(TAXONOMIES.map((taxonomy) => fetchTaxonomyLookup(taxonomy)));
  return {
    veiculo_marca: results[0],
    veiculo_modelo: results[1],
    veiculo_versao: results[2],
    veiculo_cor: results[3],
    veiculo_cidade: results[4],
    veiculo_uf: results[5],
    veiculo_unidade: results[6]
  };
}

function firstFromIdList(ids: number[] | undefined, lookup: Map<number, string>): string {
  if (!Array.isArray(ids) || !ids.length) return "";
  return lookup.get(ids[0]) ?? "";
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

async function fetchFeaturedMediaImage(mediaId: number): Promise<string | null> {
  if (!mediaId) return null;
  const url = `${MEDIA_ENDPOINT}/${mediaId}?_fields=id,source_url,media_details`;
  const media = await fetchJson<WpMedia>(url);
  return pickImageFromMedia(media);
}

async function fetchFirstImageByParent(postId: number): Promise<string | null> {
  const query = new URLSearchParams({
    parent: String(postId),
    per_page: "1",
    orderby: "id",
    order: "asc",
    _fields: "id,source_url,media_details"
  });
  const rows = await fetchJson<WpMedia[]>(`${MEDIA_ENDPOINT}?${query.toString()}`);
  return pickImageFromMedia(rows?.[0] ?? null);
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

function extractYear(title: string, content: string, metaAno: string, metaAnoModelo: string): string {
  if (metaAno && metaAnoModelo) {
    return `${metaAno}/${metaAnoModelo}`;
  }
  if (metaAno) return metaAno;
  if (metaAnoModelo) return metaAnoModelo;

  const fromTitle = title.match(TITLE_YEAR_REGEX);
  if (fromTitle) {
    return fromTitle[2] ? `${fromTitle[1]}/${fromTitle[2]}` : fromTitle[1];
  }

  const fromContent = content.match(CONTENT_YEAR_REGEX);
  if (fromContent) {
    return fromContent[2] ? `${fromContent[1]}/${fromContent[2]}` : fromContent[1];
  }

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
    if (digits) {
      return `${new Intl.NumberFormat("pt-BR").format(Number(digits))} km`;
    }
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
    if (formatted) {
      return {
        oldPrice: "",
        price: formatted
      };
    }
  }

  const matches = [...content.matchAll(new RegExp(PRICE_REGEX, "gi"))];
  if (!matches.length) {
    return { oldPrice: "", price: "Preço sob consulta" };
  }

  const values = matches.map((match) => toCurrencyValue(match[0])).filter(Boolean);
  if (!values.length) {
    return { oldPrice: "", price: "Preço sob consulta" };
  }

  if (values.length === 1) {
    return { oldPrice: "", price: values[0] };
  }

  return {
    oldPrice: `De ${values[0]}`,
    price: values[values.length - 1]
  };
}

function getQualityTag(content: string): string {
  const source = normalizeForMatch(content);
  if (source.includes("laudo cautelar aprovado")) return "Laudo aprovado";
  if (source.includes("seminovo")) return "Seminovo";
  if (source.includes("garantia")) return "Com garantia";
  return "Disponível";
}

function buildStoreLabel(value: string): string {
  if (!value) return "Unidade não informada";
  return value.replace(/\s*-\s*/g, " - ");
}

function buildName(brand: string, model: string, version: string, title: string): string {
  if (brand && model) {
    return version ? `${brand} ${model} ${version}`.trim() : `${brand} ${model}`.trim();
  }
  return title || "Veículo sem título";
}

function buildSubtitle(version: string, model: string): string {
  if (version) return version;
  if (model) return model;
  return "Versão não informada";
}

async function mapVehicle(
  vehicle: WpVehicle,
  lookups: Record<TaxonomyName, Map<number, string>>,
  featuredCache: Map<number, string | null>,
  parentCache: Map<number, string | null>
): Promise<ApiVehicle> {
  const brand = firstFromIdList(vehicle.veiculo_marca, lookups.veiculo_marca);
  const model = firstFromIdList(vehicle.veiculo_modelo, lookups.veiculo_modelo);
  const version = firstFromIdList(vehicle.veiculo_versao, lookups.veiculo_versao);
  const color = firstFromIdList(vehicle.veiculo_cor, lookups.veiculo_cor);
  const city = firstFromIdList(vehicle.veiculo_cidade, lookups.veiculo_cidade);
  const uf = firstFromIdList(vehicle.veiculo_uf, lookups.veiculo_uf);
  const store = firstFromIdList(vehicle.veiculo_unidade, lookups.veiculo_unidade);

  const title = cleanText(vehicle.title?.rendered ?? vehicle.title?.raw);
  const content = stripHtml(vehicle.content?.raw ?? vehicle.content?.rendered);

  let image: string | null = null;
  const featuredId = vehicle.featured_media ?? 0;

  if (featuredId > 0) {
    if (featuredCache.has(featuredId)) {
      image = featuredCache.get(featuredId) ?? null;
    } else {
      const resolved = await fetchFeaturedMediaImage(featuredId);
      featuredCache.set(featuredId, resolved);
      image = resolved;
    }
  }

  if (!image) {
    if (parentCache.has(vehicle.id)) {
      image = parentCache.get(vehicle.id) ?? null;
    } else {
      const resolved = await fetchFirstImageByParent(vehicle.id);
      parentCache.set(vehicle.id, resolved);
      image = resolved;
    }
  }

  const metaAno = getMetaField(vehicle, "ano");
  const metaAnoModelo = getMetaField(vehicle, "ano_modelo");
  const metaKm = getMetaField(vehicle, "km");
  const metaPrice = getMetaField(vehicle, "preco");
  const metaFuel = getMetaField(vehicle, "combustivel");
  const metaCambio = getMetaField(vehicle, "cambio");
  const priceData = extractPriceData(content, metaPrice);

  return {
    id: vehicle.id,
    slug: vehicle.slug ?? String(vehicle.id),
    url: vehicle.link ?? "#",
    name: buildName(brand, model, version, title),
    subtitle: buildSubtitle(version, model),
    image: image ?? FALLBACK_IMAGE,
    year: extractYear(title, content, metaAno, metaAnoModelo),
    transmission: extractTransmission(version, content, metaCambio),
    fuel: extractFuel(version, content, metaFuel),
    km: formatKm(content, metaKm),
    store: buildStoreLabel(store),
    oldPrice: priceData.oldPrice,
    price: priceData.price,
    qualityTag: getQualityTag(content),
    brand: brand || "Marca não informada",
    model: model || "Modelo não informado",
    version: version || "Versão não informada",
    color: color || "Cor não informada",
    city: city || "Cidade não informada",
    uf: uf || "UF não informada"
  };
}

export async function GET(request: NextRequest) {
  try {
    const perPageInput = toInt(request.nextUrl.searchParams.get("per_page"), DEFAULT_PER_PAGE);
    const perPage = clamp(perPageInput, 1, MAX_PER_PAGE);
    const authHeaders = getAuthHeaders();

    const [rows, lookups] = await Promise.all([fetchVehiclePosts(perPage, authHeaders), fetchTaxonomiesLookup()]);
    if (!rows.length) {
      return NextResponse.json({ items: [] satisfies ApiVehicle[] });
    }

    const featuredCache = new Map<number, string | null>();
    const parentCache = new Map<number, string | null>();

    const items = await Promise.all(rows.map((row) => mapVehicle(row, lookups, featuredCache, parentCache)));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] satisfies ApiVehicle[] }, { status: 200 });
  }
}


