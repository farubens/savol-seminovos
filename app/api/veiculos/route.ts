import { NextRequest, NextResponse } from "next/server";
import { resolveSavolTechnicalStoreIdFromParts } from "@/lib/savolStores";
import { buildOldPriceLabelFromOfficialPrice, formatCurrencyBRL, parseCurrencyToInteger } from "@/utils/pricing";

const DEFAULT_WP_BASE_URL =
  process.env.NODE_ENV === "production" ? "https://palevioletred-lark-270684.hostingersite.com" : "http://localhost/savol-seminovos-local";
const WP_BASE_URL = (process.env.WP_BASE_URL?.trim() || DEFAULT_WP_BASE_URL).replace(/\/+$/, "");
const VEICULO_ENDPOINT = `${WP_BASE_URL}/wp-json/wp/v2/veiculo`;
const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 200;
const WP_PAGE_SIZE = 100;
const FALLBACK_IMAGE = "/images/em-preparacao.jpg";
const MISSING_SPEC_LABEL = "N/A";
const API_CACHE_TTL_MS = 2 * 60 * 1000;
const WP_DEFAULT_USER = "fa.rubens@gmail.com";
const WP_DEFAULT_APP_PASSWORD = "W9y4 bUld QOIG PV4u oIHo csrb";
const SITE_BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.savolseminovos.com.br").replace(/\/+$/, "");

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
  absoluteUrl: string;
  name: string;
  subtitle: string;
  image: string;
  gallery: string[];
  year: string;
  transmission: string;
  fuel: string;
  km: string;
  store: string;
  storeId: number | null;
  oldPrice: string;
  price: string;
  qualityTag: string;
  secondaryHighlights: string[];
  brand: string;
  model: string;
  version: string;
  color: string;
  category: string;
  body: string;
  city: string;
  uf: string;
  molicar?: string;
  plate?: string;
  armored: boolean;
  negotiating: boolean;
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

function isMissingVehicleInfo(value: string): boolean {
  const upper = value.toUpperCase();
  if (upper.trim() === MISSING_SPEC_LABEL) return false;
  if (!upper.trim() || upper.includes("INFORMADO") || upper.includes("SOB CONSULTA")) return true;

  const normalized = normalizeForMatch(value);
  return !normalized || normalized.includes("nao informado") || normalized.includes("sob consulta");
}

function toVisibleSpecLabel(value: string): string {
  return isMissingVehicleInfo(value) ? MISSING_SPEC_LABEL : value;
}

function hasRealVehicleImageUrl(value: string): boolean {
  const normalized = value.toLowerCase();
  return Boolean(normalized) && !normalized.includes("/images/em-preparacao");
}

function compareVehiclePhotoPriority(left: ApiVehicle, right: ApiVehicle): number {
  const leftHasPhoto = hasRealVehicleImageUrl(left.image);
  const rightHasPhoto = hasRealVehicleImageUrl(right.image);
  if (leftHasPhoto === rightHasPhoto) return 0;
  return leftHasPhoto ? -1 : 1;
}

function compactFuelLabel(value: string): string {
  const cleaned = cleanText(value).toUpperCase();
  if (isMissingVehicleInfo(cleaned)) return "";

  const normalized = normalizeForMatch(cleaned);
  const hasAlcohol = normalized.includes("alcool") || normalized.includes("etanol");
  const hasGasoline = normalized.includes("gasolina");
  const hasGnv = normalized.includes("gas natural") || /\bgnv\b/.test(normalized);

  if (hasAlcohol && hasGasoline && hasGnv) return "FLEX/GNV";
  if (hasAlcohol && hasGasoline) return "FLEX";
  if (normalized.includes("diesel")) return "DIESEL";
  if (normalized.includes("hibrid") || cleaned.includes("BRIDO")) return "HIBRIDO";
  if (normalized.includes("eletric") || cleaned.includes("TRICO")) return "ELETRICO";
  if (hasGasoline) return "GASOLINA";
  if (hasGnv) return "GNV";
  if (hasAlcohol) return "ETANOL";
  return cleaned;
}

function compactTransmissionLabel(value: string): string {
  const cleaned = cleanText(value).toUpperCase();
  if (isMissingVehicleInfo(cleaned)) return "";

  const normalized = normalizeForMatch(cleaned);
  if (normalized.includes("cvt")) return "CVT";
  if (/\bdct\b/.test(normalized)) return "DCT";
  if (cleaned.includes("AUTOM") || normalized.includes("automatizado")) return "AUT.";
  if (normalized.includes("automatic") || /\bat\d?\b/.test(normalized)) return "AUT.";
  if (cleaned.includes("MANUAL") || normalized.includes("manual") || /\bmt\d?\b/.test(normalized)) return "MAN.";
  return cleaned;
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

const KNOWN_BRAND_MODEL_PATTERNS: Array<[brand: string, patterns: string[]]> = [
  ["CHEVROLET", ["onix", "tracker", "cruze", "cobalt", "prisma", "spin", "s10", "montana"]],
  ["FIAT", ["fastback", "argo", "mobi", "toro", "strada", "cronos", "pulse", "uno", "palio", "siena"]],
  ["VOLKSWAGEN", ["polo", "t-cross", "t cross", "nivus", "fox", "gol", "taos", "tera", "saveiro", "tiguan", "virtus", "jetta"]],
  ["KIA", ["kia", "sportage", "sorento", "cerato", "picanto", "seltos", "soul", "carnival"]],
  ["JEEP", ["compass", "renegade", "commander"]],
  ["HYUNDAI", ["hb20", "creta", "tucson", "ix35", "santa fe"]],
  ["TOYOTA", ["corolla", "yaris", "hilux", "sw4", "etios", "rav4"]],
  ["PEUGEOT", ["208", "2008", "3008", "partner"]],
  ["CITROEN", ["c3", "c4", "aircross", "jumpy"]],
  ["FORD", ["ecosport", "ka", "ranger", "fiesta", "focus"]],
  ["HONDA", ["city", "civic", "fit", "hr-v", "hrv", "wr-v", "wrv"]],
  ["RENAULT", ["kwid", "logan", "sandero", "captur", "duster"]],
  ["NISSAN", ["versa", "kicks", "sentra", "frontier"]],
  ["CHERY", ["tiggo", "arrizo"]],
  ["BYD", ["song", "dolphin", "yuan", "seal"]],
  ["GWM", ["haval", "ora", "tank"]],
  ["MG", ["mg", "zs", "hs"]]
];

function normalizeMatchWords(value: string): string {
  return ` ${normalizeForMatch(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

function isMultibrandLabel(value: string): boolean {
  const normalized = normalizeForMatch(value).replace(/[^a-z0-9]+/g, "");
  return normalized === "multimarca" || normalized === "multmarca";
}

function removeMultibrandLabel(value: string): string {
  return cleanText(value.replace(/\bMULTI?MARCA\b/gi, " ").replace(/\bMULTMARCA\b/gi, " "));
}

function inferVehicleBrandFromText(value: string): string {
  const source = normalizeMatchWords(value);
  for (const [brand, patterns] of KNOWN_BRAND_MODEL_PATTERNS) {
    if (patterns.some((pattern) => source.includes(normalizeMatchWords(pattern)))) {
      return brand;
    }
  }
  return "";
}

function normalizeVehicleBrandLabel(value: string, context = ""): string {
  const cleaned = removeMultibrandLabel(cleanText(value));
  const normalized = normalizeForMatch(cleaned).replace(/[^a-z0-9]+/g, " ").trim();
  if (normalized === "kia" || normalized === "kia motors") return "KIA";
  if (!cleaned || isMultibrandLabel(value)) return inferVehicleBrandFromText(context);
  return cleaned;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLeadingBrandFromLabel(value: string, brand: string): string {
  let cleaned = removeMultibrandLabel(cleanText(value));
  if (!cleaned || !brand) return cleaned;
  const brandAliases = brand === "KIA" ? ["KIA MOTORS", "KIA"] : [brand];
  let changed = true;
  while (changed) {
    changed = false;
    for (const alias of brandAliases) {
      const aliasWords = normalizeMatchWords(alias).trim();
      const cleanedWords = normalizeMatchWords(cleaned).trim();
      if (cleanedWords === aliasWords) return "";
      if (cleanedWords.startsWith(`${aliasWords} `)) {
        const aliasPattern = alias
          .trim()
          .split(/\s+/)
          .map(escapeRegExp)
          .join("[^A-Za-z0-9]+");
        const nextCleaned = cleanText(cleaned.replace(new RegExp(`^${aliasPattern}\\s*`, "i"), ""));
        if (nextCleaned === cleaned) return cleaned;
        cleaned = nextCleaned;
        changed = true;
        break;
      }
    }
  }
  return cleaned;
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

function parseBooleanMeta(value: string): boolean {
  const normalized = normalizeForMatch(value).replace(/[^a-z0-9]+/g, "");
  return ["1", "s", "sim", "true", "yes", "y"].includes(normalized);
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
  if (metaFuel) return compactFuelLabel(metaFuel);

  const source = normalizeForMatch(`${version} ${content}`);
  if (source.includes("flex")) return "FLEX";
  if (source.includes("diesel")) return "DIESEL";
  if (source.includes("gasolina") && (source.includes("etanol") || source.includes("alcool"))) return "FLEX";
  if (source.includes("gasolina")) return "GASOLINA";
  if (source.includes("etanol") || source.includes("alcool")) return "ETANOL";
  if (source.includes("hibrid")) return "Híbrido";
  if (source.includes("eletric")) return "Elétrico";
  return "Combustível não informado";
}

function extractTransmission(version: string, content: string, metaCambio: string): string {
  const source = normalizeForMatch(`${version} ${content} ${metaCambio}`);
  if (source.includes("cvt")) return "CVT";
  if (source.includes("manual")) return "Manual";
  if (source.includes("automatizado")) return "Automatizado";
  if (/\bdct\b/.test(source)) return "DCT";
  if (/\bmt\d?\b/.test(source)) return "Manual";
  if (metaCambio) return cleanText(metaCambio);
  if (source.includes("automatic")) return "Automático";
  if (/\bat\d?\b/.test(source)) return "Automático";
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
  const numeric = parseCurrencyToInteger(raw);
  if (!numeric || numeric <= 0) return "";
  return formatCurrencyBRL(numeric);
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
  const cleaned = removeMultibrandLabel(title.replace(TITLE_YEAR_REGEX, "").trim());
  if (!cleaned) return { brand: "", model: "", version: "" };
  const inferredBrand = inferVehicleBrandFromText(cleaned);
  if (inferredBrand) {
    const withoutBrand = stripLeadingBrandFromLabel(cleaned, inferredBrand);
    const inferredParts = withoutBrand.split(" ").filter(Boolean);
    if (!inferredParts.length) return { brand: inferredBrand, model: "", version: "" };
    return { brand: inferredBrand, model: inferredParts[0], version: inferredParts.slice(1).join(" ") };
  }
  const parts = cleaned.split(" ").filter(Boolean);
  if (!parts.length) return { brand: "", model: "", version: "" };
  if (parts.length === 1) return { brand: parts[0], model: "", version: "" };
  if (parts.length === 2) return { brand: parts[0], model: parts[1], version: "" };
  return { brand: parts[0], model: parts[1], version: parts.slice(2).join(" ") };
}

function buildName(brand: string, model: string, version: string, year: string, title: string): string {
  if (brand && model) {
    const normalizedModel = normalizeMatchWords(model);
    const normalizedVersion = normalizeMatchWords(version).trim();
    const modelAlreadyContainsVersion = Boolean(
      normalizedVersion && normalizedModel.includes(` ${normalizedVersion} `)
    );
    const nameParts = [brand, model];
    if (version && !modelAlreadyContainsVersion) nameParts.push(version);
    if (year) nameParts.push(year);
    return nameParts.join(" ").trim();
  }
  return removeMultibrandLabel(title) || "Veículo sem título";
}

function buildSubtitle(version: string, model: string, excerpt: string): string {
  if (version) return removeMultibrandLabel(version);
  if (model) return removeMultibrandLabel(model);
  if (excerpt) return removeMultibrandLabel(excerpt);
  return "Versão não informada";
}

function mapVehicle(vehicle: WpVehicle): ApiVehicle {
  const title = cleanText(vehicle.title?.rendered ?? vehicle.title?.raw);
  const content = stripHtml(vehicle.content?.raw ?? vehicle.content?.rendered);
  const excerpt = stripHtml(vehicle.excerpt?.raw ?? vehicle.excerpt?.rendered);

  const sanitizedTitle = removeMultibrandLabel(title);
  const fallbackFromTitle = parseBrandModelVersionFromTitle(title);
  const rawBrand = getEmbeddedTerm(vehicle, "veiculo_marca") || fallbackFromTitle.brand;
  const rawModel = getEmbeddedTerm(vehicle, "veiculo_modelo") || fallbackFromTitle.model;
  const rawVersion = getEmbeddedTerm(vehicle, "veiculo_versao") || fallbackFromTitle.version;
  const brandContext = [title, rawBrand, rawModel, rawVersion].join(" ");
  const brand = normalizeVehicleBrandLabel(rawBrand, brandContext);
  const model = stripLeadingBrandFromLabel(rawModel, brand);
  const version = stripLeadingBrandFromLabel(rawVersion, brand);
  const color = getEmbeddedTerm(vehicle, "veiculo_cor");
  const city = getEmbeddedTerm(vehicle, "veiculo_cidade");
  const uf = getEmbeddedTerm(vehicle, "veiculo_uf");
  const store = getEmbeddedTerm(vehicle, "veiculo_unidade");
  const storeLabel = buildStoreLabel(store);
  const storeId = resolveSavolTechnicalStoreIdFromParts([storeLabel]);
  const primaryHighlight = getEmbeddedTerm(vehicle, "veiculo_informacao_destaque");
  const secondaryHighlights = getEmbeddedTerms(vehicle, "veiculo_destaque_secundario");

  const metaAno = getMetaField(vehicle, "ano");
  const metaAnoModelo = getMetaField(vehicle, "ano_modelo");
  const metaKm = getMetaField(vehicle, "km");
  const metaPrice = getMetaField(vehicle, "preco");
  const metaFuel = getMetaField(vehicle, "combustivel");
  const metaCambio = getMetaField(vehicle, "cambio");
  const metaCategory = getMetaField(vehicle, "categoria");
  const metaBody = getMetaField(vehicle, "carroceria") || getMetaField(vehicle, "savol_vsc_vehicle_body_type");
  const metaCondition = getMetaField(vehicle, "condicao");
  const metaGalleryUrls = getMetaField(vehicle, "autosync_photo_urls");
  const metaMolicar = getMetaField(vehicle, "molicar");
  const metaPlate = normalizePlateValue(getMetaField(vehicle, "placa") || getMetaField(vehicle, "plate"));
  const metaArmored = getMetaField(vehicle, "blindado");
  const metaNegotiating = getMetaField(vehicle, "negociacao") || getMetaField(vehicle, "apolo_negociacao");
  const priceData = extractPriceData(content, metaPrice);

  const image = encodeURI(getEmbeddedImage(vehicle) ?? FALLBACK_IMAGE);
  const galleryFromMeta = parseGalleryUrls(metaGalleryUrls);
  const gallery = Array.from(new Set([image, ...galleryFromMeta].filter(Boolean)));
  const year = extractYear(title, content, metaAno, metaAnoModelo);
  const visibleYear = toVisibleSpecLabel(year);
  const visibleModelYear = toVisibleSpecLabel(metaAnoModelo || year.split("/").at(-1) || year);
  const transmission = compactTransmissionLabel(extractTransmission(version, content, metaCambio));
  const fuel = compactFuelLabel(extractFuel(version, content, metaFuel));
  const km = formatKm(content, metaKm);

  return {
    id: vehicle.id,
    slug: vehicle.slug ?? String(vehicle.id),
    url: `/veiculos/${vehicle.slug ?? vehicle.id}`,
    absoluteUrl: `${SITE_BASE_URL}/veiculos/${vehicle.slug ?? vehicle.id}`,
    name: buildName(brand, model, version, visibleModelYear, sanitizedTitle),
    subtitle: buildSubtitle(version, model, excerpt),
    image,
    gallery: gallery.length ? gallery : [FALLBACK_IMAGE],
    year: visibleYear,
    transmission: toVisibleSpecLabel(transmission),
    fuel: toVisibleSpecLabel(fuel),
    km: toVisibleSpecLabel(km),
    store: storeLabel,
    storeId,
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
    category: metaCategory,
    body: metaBody,
    molicar: metaMolicar || "",
    plate: metaPlate || "",
    armored: parseBooleanMeta(metaArmored),
    negotiating: parseBooleanMeta(metaNegotiating)
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

        const items = rows.map(mapVehicle).sort(compareVehiclePhotoPriority);
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
