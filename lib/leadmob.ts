const LEADMOB_BASE_URL = "https://leadmob.com.br/app/tools/leads/endpoint.php";
const DEFAULT_EMPRESA = "10244";
const DEFAULT_ORIGEM = "1";
const DEPARTAMENTO_SEMINOVOS = "2";
const DEPARTAMENTO_ADMINISTRATIVO = "9";

const LEADMOB_COMPANIES_BY_UNIT = [
  { id: 10244, terms: ["savol mg sao caetano", "mg motor sao caetano", "mg sao caetano"] },
  { id: 10038, terms: ["toyota santo andre"] },
  { id: 10039, terms: ["toyota praia grande", "toyota pr grande"] },
  { id: 10051, terms: ["toyota maua"] },
  { id: 10223, terms: ["toyota dom pedro", "toyota dom pedro ii", "toyota em breve"] },
  { id: 10040, terms: ["toyota sao bernardo", "toyota s bernardo"] },
  { id: 10057, terms: ["volkswagen santo andre", "volks santo andre", "vw santo andre"] },
  { id: 10058, terms: ["volkswagen pereira barreto", "volks pereira barreto", "vw pereira barreto"] },
  { id: 10125, terms: ["citroen sao caetano"] },
  { id: 10124, terms: ["citroen sao bernardo"] },
  { id: 10123, terms: ["citroen santo andre"] },
  { id: 10129, terms: ["peugeot sao caetano"] },
  { id: 10128, terms: ["peugeot sao bernardo"] },
  { id: 10127, terms: ["peugeot santo andre"] },
  { id: 10188, terms: ["fiat sao caetano"] },
  { id: 10189, terms: ["fiat sao bernardo"] },
  { id: 10166, terms: ["fiat santo andre"] },
  { id: 10191, terms: ["kia sao paulo", "kia ipiranga"] },
  { id: 10190, terms: ["kia santo andre"] },
  { id: 10218, terms: ["consorcio"] },
  { id: 10224, terms: ["pos vendas", "pos venda"] },
  { id: 10216, terms: ["assinaturas", "assinatura"] }
] as const;

export type LeadmobVehicle = {
  id?: string | number;
  plate?: string;
  brand?: string;
  model?: string;
  version?: string;
  year?: string | number;
  manufactureYear?: string | number;
  km?: string | number;
  color?: string;
  fuel?: string;
  transmission?: string;
  price?: string | number;
  oldPrice?: string | number;
  store?: string;
  city?: string;
  uf?: string;
  url?: string;
  molicar?: string;
  subtitle?: string;
};

export type LeadmobLeadInput = {
  name: string;
  phone: string;
  email: string;
  message?: string;
  subject?: string;
  form?: string;
  unitName?: string;
  companyId?: string | number;
  departmentId?: string | number;
  originId?: string | number;
  suboriginId?: string | number;
  protocol?: string;
  sellerCpf?: string;
  vehicle?: LeadmobVehicle;
  utm?: Record<string, string | undefined>;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

export type LeadmobResult = {
  ok: boolean;
  status: number;
  request: Record<string, unknown>;
  response: unknown;
  error?: string;
};

function onlyDigits(value: string | number | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizePhone(value: string): string {
  const digits = onlyDigits(value);
  if (digits.startsWith("55") && digits.length > 11) return digits.slice(2, 13);
  if (digits.length > 11) return digits.slice(-11);
  return digits;
}

function trimText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeForMatch(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveLeadmobCompanyId(input: LeadmobLeadInput): number {
  if (input.companyId) {
    const explicitCompanyId = Number(input.companyId);
    if (Number.isFinite(explicitCompanyId) && explicitCompanyId > 0) return explicitCompanyId;
  }

  const candidates = [
    input.unitName,
    input.vehicle?.store,
    input.vehicle?.brand && input.vehicle?.city ? `${input.vehicle.brand} ${input.vehicle.city}` : "",
    input.vehicle?.brand && input.vehicle?.uf ? `${input.vehicle.brand} ${input.vehicle.uf}` : ""
  ].map(normalizeForMatch).filter(Boolean);

  for (const candidate of candidates) {
    const match = LEADMOB_COMPANIES_BY_UNIT.find((company) =>
      company.terms.some((term) => {
        const normalizedTerm = normalizeForMatch(term);
        return candidate.includes(normalizedTerm) || normalizedTerm.includes(candidate);
      })
    );
    if (match) return match.id;
  }

  return Number(DEFAULT_EMPRESA);
}

function resolveLeadmobDepartmentId(input: LeadmobLeadInput): number {
  if (input.departmentId) {
    const explicitDepartmentId = Number(input.departmentId);
    if (Number.isFinite(explicitDepartmentId) && explicitDepartmentId > 0) return explicitDepartmentId;
  }

  const form = normalizeForMatch(input.form);
  const subject = normalizeForMatch(input.subject);
  if (form.includes("venda seu carro") || subject.includes("venda seu carro")) {
    return Number(DEPARTAMENTO_ADMINISTRATIVO);
  }

  return Number(DEPARTAMENTO_SEMINOVOS);
}

function buildObservation(input: LeadmobLeadInput): string {
  const utm = input.utm || {};
  const chunks = [
    input.form ? `Form: ${input.form}` : "",
    input.subject ? `Assunto: ${input.subject}` : "",
    input.unitName ? `Unidade: ${input.unitName}` : "",
    input.vehicle?.plate ? `Placa: ${input.vehicle.plate}` : "",
    input.vehicle?.brand ? `Marca: ${input.vehicle.brand}` : "",
    input.vehicle?.model ? `Modelo: ${input.vehicle.model}` : "",
    utm.utm_source ? `utm_source: ${utm.utm_source}` : "",
    utm.utm_campaign ? `utm_campaign: ${utm.utm_campaign}` : "",
    input.meta
      ? Object.entries(input.meta)
          .filter(([, value]) => value !== undefined && value !== null && value !== "")
          .map(([key, value]) => `${key}: ${value}`)
          .join(" | ")
      : ""
  ].filter(Boolean);

  return trimText(chunks.join(" | "), 255);
}

function buildMessage(input: LeadmobLeadInput): string {
  const vehicle = input.vehicle || {};
  const meta = input.meta || {};
  const utm = input.utm || {};
  const ignoredMetaKeys = new Set([
    "page_url",
    "landing_page",
    "referrer",
    "meta_form",
    "meta_campanha",
    "meta_conjunto_anuncio",
    "meta_anuncio",
    "meta_plataforma"
  ]);
  const extraMetaLine = Object.entries(meta)
    .filter(([key, value]) => !ignoredMetaKeys.has(key) && value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join(" | ");
  const lines = [
    input.message,
    vehicle.id ? `ID veículo: ${vehicle.id}` : "",
    vehicle.plate ? `Placa: ${vehicle.plate}` : "",
    vehicle.brand ? `Marca: ${vehicle.brand}` : "",
    vehicle.model ? `Modelo: ${vehicle.model}` : "",
    vehicle.version ? `Versão: ${vehicle.version}` : "",
    vehicle.subtitle ? `Descrição: ${vehicle.subtitle}` : "",
    vehicle.year ? `Ano modelo: ${vehicle.year}` : "",
    vehicle.manufactureYear ? `Ano fabricação: ${vehicle.manufactureYear}` : "",
    vehicle.km ? `KM: ${vehicle.km}` : "",
    vehicle.color ? `Cor: ${vehicle.color}` : "",
    vehicle.fuel ? `Combustível: ${vehicle.fuel}` : "",
    vehicle.transmission ? `Câmbio: ${vehicle.transmission}` : "",
    vehicle.price ? `Preço: ${vehicle.price}` : "",
    vehicle.oldPrice ? `Preço anterior: ${vehicle.oldPrice}` : "",
    vehicle.store ? `Loja do veículo: ${vehicle.store}` : "",
    vehicle.city || vehicle.uf ? `Cidade/UF: ${[vehicle.city, vehicle.uf].filter(Boolean).join(" - ")}` : "",
    vehicle.molicar ? `Molicar: ${vehicle.molicar}` : "",
    vehicle.url ? `URL veículo: ${vehicle.url}` : "",
    input.unitName ? `Unidade escolhida: ${input.unitName}` : "",
    meta.page_url ? `Página do lead: ${meta.page_url}` : "",
    meta.landing_page ? `Landing page: ${meta.landing_page}` : "",
    meta.referrer ? `Referência: ${meta.referrer}` : "",
    extraMetaLine ? `Dados extras: ${extraMetaLine}` : "",
    Object.keys(utm).length
      ? `Tracking: ${Object.entries(utm)
          .filter(([, value]) => value)
          .map(([key, value]) => `${key}=${value}`)
          .join(" | ")}`
      : ""
  ].filter(Boolean);

  return trimText(lines.join("\n"), 2000);
}

function buildLeadmobPayload(input: LeadmobLeadInput): Record<string, unknown> {
  const utm = input.utm || {};
  const meta = input.meta || {};
  const vehicle = input.vehicle || {};

  return {
    Empresa: resolveLeadmobCompanyId(input),
    nome: trimText(input.name, 50),
    telefone: normalizePhone(input.phone),
    email: trimText(input.email, 50),
    mensagem: buildMessage(input),
    departamento: resolveLeadmobDepartmentId(input),
    protocolo: trimText(input.protocol, 20),
    origem: Number(input.originId || DEFAULT_ORIGEM),
    suborigem: input.suboriginId ? Number(input.suboriginId) : undefined,
    observacao: buildObservation(input),
    cpf_vendedor: onlyDigits(input.sellerCpf).slice(0, 11),
    placa: trimText(vehicle.plate, 7).replace(/[^A-Z0-9]/gi, "").toUpperCase(),
    marca: trimText(vehicle.brand, 20),
    modelo: trimText(vehicle.model, 50),
    ano_modelo: vehicle.year ? Number(onlyDigits(vehicle.year).slice(0, 4)) : undefined,
    termometro: "M",
    gclid: trimText(utm.gclid, 255),
    utm_source: trimText(utm.utm_source, 100),
    utm_medium: trimText(utm.utm_medium, 100),
    utm_campaign: trimText(utm.utm_campaign, 150),
    utm_term: trimText(utm.utm_term, 150),
    utm_content: trimText(utm.utm_content, 150),
    id_facebook: trimText(utm.id_facebook || utm.fbclid, 255),
    meta_form: trimText(input.form || meta.meta_form, 255),
    meta_campanha: trimText(meta.meta_campanha || utm.utm_campaign, 255),
    meta_conjunto_anuncio: trimText(meta.meta_conjunto_anuncio || utm.utm_medium, 255),
    meta_anuncio: trimText(meta.meta_anuncio || utm.utm_content, 255),
    meta_plataforma: trimText(meta.meta_plataforma || utm.utm_source || "site", 255)
  };
}

function cleanPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== "" && !Number.isNaN(value)));
}

function buildFormBody(payload: Record<string, unknown>): URLSearchParams {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    body.set(key, String(value));
  }
  return body;
}

export function validateLeadmobInput(input: LeadmobLeadInput): string | null {
  if (!input.name?.trim()) return "Informe o nome.";
  if (normalizePhone(input.phone).length < 10) return "Informe um telefone válido.";
  if (!/^\S+@\S+\.\S+$/.test(input.email?.trim() || "")) return "Informe um e-mail válido.";
  return null;
}

export async function insertLeadmobLead(input: LeadmobLeadInput): Promise<LeadmobResult> {
  const username = process.env.LEADMOB_USERNAME?.trim();
  const password = process.env.LEADMOB_PASSWORD?.trim();
  const payload = cleanPayload(buildLeadmobPayload(input));

  if (!username || !password) {
    return {
      ok: false,
      status: 500,
      request: payload,
      response: null,
      error: "Credenciais Leadmob não configuradas."
    };
  }

  const authorization = Buffer.from(`${username}:${password}`).toString("base64");
  const response = await fetch(`${LEADMOB_BASE_URL}/insert`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/plain, */*"
    },
    body: buildFormBody(payload),
    cache: "no-store"
  });

  const responseText = await response.text();
  let responsePayload: unknown = responseText;
  try {
    responsePayload = JSON.parse(responseText);
  } catch {
    responsePayload = responseText;
  }

  const serialized = typeof responsePayload === "string" ? responsePayload : JSON.stringify(responsePayload);
  const ok = response.ok && (serialized.includes("0000") || /salvo com sucesso/i.test(serialized));

  return {
    ok,
    status: response.status,
    request: payload,
    response: responsePayload,
    error: ok ? undefined : "Leadmob não confirmou o cadastro do lead."
  };
}
