import { NextRequest, NextResponse } from "next/server";

const WP_BASE_URL = "https://palevioletred-lark-270684.hostingersite.com";
const UNIDADE_ENDPOINT = `${WP_BASE_URL}/wp-json/wp/v2/veiculo_unidade`;
const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 30;

type WpUnidadeTerm = {
  id: number;
  name?: string;
  slug?: string;
  link?: string;
  count?: number;
  meta?: Record<string, unknown>;
};

type ApiStore = {
  id: number;
  slug: string;
  brand: string;
  name: string;
  address: string;
  phone: string;
  vehiclesCount: number;
  storeUrl: string;
  mapUrl: string;
};

type StoreFallback = {
  phone: string;
  address: string;
};

const FALLBACK_ADDRESS = "Av. Pereira Barreto, 888 - Paraíso, Santo André - SP, 09190-610";
const FALLBACK_PHONE = "(11) 4435-1000";

const STORE_INFO_FALLBACK: Record<string, StoreFallback> = {
  "unidade savol toyota santo andre": {
    phone: "(11) 4979-6000",
    address: "Av. Artur de Queirós, 469 - Casa Branca, Santo André - SP, 09015-510"
  },
  "unidade savol toyota sao bernardo do campo": {
    phone: "(11) 3809-1000",
    address: "Av. Senador Vergueiro, 2332 - Anchieta, São Bernardo do Campo - SP, 09600-004"
  },
  "unidade savol toyota maua": {
    phone: "(11) 4979-6000",
    address: "Av. João Ramalho, 1853 - Vila Noêmia, Mauá - SP, 09371-520"
  },
  "unidade savol toyota praia grande": {
    phone: "(13) 3476-7000",
    address: "Av. Guilhermina, 1021 - Guilhermina, Praia Grande - SP, 11701-500"
  },
  "unidade savol toyota dom pedro ii": {
    phone: "(11) 4979-6000",
    address: "Av. Dom Pedro II, 2500 - Santo André - SP, 09080-110"
  },
  "unidade savol volkswagen santo andre": {
    phone: "(11) 4435-1000",
    address: "Av. Artur de Queirós, 701 - Casa Branca, Santo André - SP, 09015-510"
  },
  "unidade savol volkswagen pereira barreto": {
    phone: "(11) 4435-1000",
    address: "Av. Pereira Barreto, 888 - Paraíso, Santo André - SP, 09190-610"
  },
  "unidade savol peugeot santo andre": {
    phone: "(11) 3381-1000",
    address: "Av. Artur de Queirós, 426 - Casa Branca, Santo André - SP, 09015-510"
  },
  "unidade savol peugeot sao bernardo do campo": {
    phone: "(11) 3381-1000",
    address: "Av. Senador Vergueiro, 2302 - Anchieta, São Bernardo do Campo - SP, 09600-004"
  },
  "unidade savol peugeot sao caetano do sul": {
    phone: "(11) 3381-1000",
    address: "Av. Goiás, 2155 - Santo Antônio, São Caetano do Sul - SP, 09521-300"
  },
  "unidade savol citroen santo andre": {
    phone: "(11) 3381-1001",
    address: "Av. Artur de Queirós, 424 - Casa Branca, Santo André - SP, 09015-510"
  },
  "unidade savol citroen sao bernardo do campo": {
    phone: "(11) 3381-1001",
    address: "Av. Senador Vergueiro, 2302 - Rudge Ramos, São Bernardo do Campo - SP, 09600-004"
  },
  "unidade savol citroen sao caetano do sul": {
    phone: "(11) 3381-1001",
    address: "Av. Goiás, 2155 - Santo Antônio, São Caetano do Sul - SP, 09521-300"
  },
  "unidade savol fiat santo andre": {
    phone: "(11) 3319-1000",
    address: "Av. Artur de Queirós, 414 - Casa Branca, Santo André - SP, 09015-510"
  },
  "unidade savol fiat sao caetano do sul": {
    phone: "(11) 3319-1000",
    address: "Av. Goiás, 2145 - Barcelona, São Caetano do Sul - SP, 09550-001"
  },
  "unidade savol fiat sao bernardo do campo": {
    phone: "(11) 3319-1000",
    address: "Av. Senador Vergueiro, 2348 - Anchieta, São Bernardo do Campo - SP, 09600-004"
  },
  "unidade savol kia santo andre": {
    phone: "(11) 3381-1010",
    address: "Av. Artur de Queirós, 727 - Casa Branca, Santo André - SP, 09015-510"
  },
  "unidade savol kia sao paulo": {
    phone: "(11) 3381-1010",
    address: "Av. Nazaré, 444 - Ipiranga, São Paulo - SP, 04262-000"
  },
  "unidade savol mg motor": {
    phone: "(11) 3809-1010",
    address: "Av. Goiás, 3048 - Santo Antônio, São Caetano do Sul - SP, 09521-310"
  },
  "unidade savol jetour": {
    phone: "(11) 3319-1010",
    address: "Av. Dom Pedro II, 2550 - Campestre, Santo André - SP, 09080-000"
  },
  "unidade savol jetour sao caetano do sul": {
    phone: "(11) 3319-1010",
    address: "Alameda Terracota, 545 - Cerâmica, São Caetano do Sul - SP, 09531-190"
  }
};

const BRAND_LABELS: Array<[string, string]> = [
  ["volkswagen", "Volkswagen"],
  ["toyota", "Toyota"],
  ["peugeot", "Peugeot"],
  ["citroen", "Citro«n"],
  ["abarth", "Abarth"],
  ["jetour", "Jetour"],
  ["mg motor", "MG Motor"],
  ["fiat", "Fiat"],
  ["kia", "Kia"],
  ["savol", "Savol"]
];

export const dynamic = "force-dynamic";

function toInt(value: string | null | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cleanText(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toMetaString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return cleanText(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (Array.isArray(value)) return toMetaString(value[0]);
  if (typeof value === "object") {
    const rendered = (value as { rendered?: unknown }).rendered;
    if (rendered != null) return toMetaString(rendered);
  }
  return "";
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

function formatStoreName(value: string): string {
  const smallWords = new Set(["de", "da", "do", "dos", "das", "e"]);
  const words = cleanText(value).split(" ");
  const normalized = words.map((word, index) => {
    const lower = word.toLowerCase();
    if (smallWords.has(lower) && index > 0) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
  return normalized
    .join(" ")
    .replace(/\bVw\b/g, "VW")
    .replace(/\bMg\b/g, "MG")
    .replace(/\bIi\b/g, "II");
}

function inferBrand(storeName: string): string {
  const normalizedName = normalize(storeName);
  for (const [needle, label] of BRAND_LABELS) {
    if (normalizedName.includes(needle)) return label;
  }
  return "Savol";
}

function findFallback(storeName: string): StoreFallback | null {
  const normalizedName = normalize(storeName);
  const direct = STORE_INFO_FALLBACK[normalizedName];
  if (direct) return direct;

  const prefixed = STORE_INFO_FALLBACK[`unidade ${normalizedName}`];
  if (prefixed) return prefixed;

  for (const [key, value] of Object.entries(STORE_INFO_FALLBACK)) {
    if (key.includes(normalizedName) || normalizedName.includes(key)) return value;
  }
  return null;
}

function extractTermMeta(term: WpUnidadeTerm): { address: string; phone: string } {
  const addressKeys = ["veiculo_unidade_endereco", "endereco", "address"];
  const phoneKeys = ["veiculo_unidade_telefone", "telefone", "phone"];

  let address = "";
  let phone = "";

  for (const key of addressKeys) {
    const candidate = toMetaString(term.meta?.[key]);
    if (candidate) {
      address = candidate;
      break;
    }
  }

  for (const key of phoneKeys) {
    const candidate = toMetaString(term.meta?.[key]);
    if (candidate) {
      phone = candidate;
      break;
    }
  }

  return { address, phone };
}

function buildMapUrl(value: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

function mapTermToStore(term: WpUnidadeTerm): ApiStore {
  const rawName = cleanText(term.name) || `Unidade ${term.id}`;
  const displayName = formatStoreName(rawName);
  const brand = inferBrand(displayName);
  const fallback = findFallback(displayName);
  const fromMeta = extractTermMeta(term);
  const address = fromMeta.address || fallback?.address || FALLBACK_ADDRESS;
  const phone = fromMeta.phone || fallback?.phone || FALLBACK_PHONE;
  const vehiclesCount = Number(term.count ?? 0);
  const termSlug = cleanText(term.slug) || String(term.id);
  const storeUrl = cleanText(term.link) || `${WP_BASE_URL}/veiculo_unidade/${termSlug}`;

  return {
    id: term.id,
    slug: termSlug,
    brand,
    name: displayName,
    address,
    phone,
    vehiclesCount,
    storeUrl,
    mapUrl: buildMapUrl(address || displayName)
  };
}

async function fetchStores(perPage: number, authHeaders: HeadersInit): Promise<WpUnidadeTerm[]> {
  const query = new URLSearchParams({
    per_page: String(perPage),
    hide_empty: "true",
    _fields: "id,name,slug,link,count,meta"
  });

  if (Object.keys(authHeaders).length > 0) {
    const editQuery = new URLSearchParams(query);
    editQuery.set("context", "edit");
    const editRows = await fetchJson<WpUnidadeTerm[]>(`${UNIDADE_ENDPOINT}?${editQuery.toString()}`, {
      headers: authHeaders
    });
    if (Array.isArray(editRows) && editRows.length) return editRows;
  }

  const viewRows = await fetchJson<WpUnidadeTerm[]>(`${UNIDADE_ENDPOINT}?${query.toString()}`);
  return Array.isArray(viewRows) ? viewRows : [];
}

export async function GET(request: NextRequest) {
  try {
    const perPageInput = toInt(request.nextUrl.searchParams.get("per_page"), DEFAULT_PER_PAGE);
    const perPage = clamp(perPageInput, 1, MAX_PER_PAGE);
    const authHeaders = getAuthHeaders();
    const terms = await fetchStores(perPage, authHeaders);

    if (!terms.length) {
      return NextResponse.json({ items: [] satisfies ApiStore[] });
    }

    const items = terms
      .map(mapTermToStore)
      .sort((a, b) => b.vehiclesCount - a.vehiclesCount)
      .slice(0, perPage);

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] satisfies ApiStore[] }, { status: 200 });
  }
}


