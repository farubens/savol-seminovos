export const LEADMOB_DEFAULT_EMPRESA = "10104";
export const LEADMOB_DEFAULT_ORIGEM = "1";
export const LEADMOB_DEFAULT_ORIGEM_LABEL = "SITE SEMINOVOS";

const DEPARTAMENTO_SEMINOVOS = "2";

const LEADMOB_COMPANIES_BY_UNIT = [
  { id: 10104, terms: ["savol grupo", "atendimento savol", "sem preferencia", "unidade nao informada"] },
  { id: 10041, terms: ["savol toyota grupo", "toyota grupo"] },
  { id: 10295, terms: ["savol mg sao caetano", "mg motor sao caetano", "mg sao caetano"] },
  { id: 10300, terms: ["savol mg analia", "savol mg motor analia", "mg motor analia", "mg analia"] },
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
  { id: 10280, terms: ["jetour santo andre", "savol jetour santo andre"] },
  { id: 10289, terms: ["jetour sao caetano", "savol jetour sao caetano", "jetour scs"] },
  { id: 10218, terms: ["consorcio"] },
  { id: 10224, terms: ["pos vendas", "pos venda"] },
  { id: 10216, terms: ["assinaturas", "assinatura"] }
] as const;

type LeadmobTechnicalCompanyRule = {
  technicalIds: readonly string[];
  id: number;
  terms?: readonly string[];
  fallbackId?: number;
};

const LEADMOB_COMPANIES_BY_TECHNICAL_UNIT: readonly LeadmobTechnicalCompanyRule[] = [
  { technicalIds: ["18882"], id: 10057 },
  { technicalIds: ["25815"], id: 10040 },
  { technicalIds: ["25817"], id: 10038, terms: ["toyota santo andre"], fallbackId: 10038 },
  { technicalIds: ["25817"], id: 10223, terms: ["toyota dom pedro", "dom pedro"] },
  { technicalIds: ["25820"], id: 10039 },
  { technicalIds: ["101181625"], id: 10127, terms: ["peugeot santo andre", "peugeot"], fallbackId: 10127 },
  { technicalIds: ["101181625"], id: 10123, terms: ["citroen santo andre", "citroen"] },
  { technicalIds: ["101181626"], id: 10128, terms: ["peugeot sao bernardo", "peugeot"], fallbackId: 10128 },
  { technicalIds: ["101181626"], id: 10124, terms: ["citroen sao bernardo", "citroen"] },
  { technicalIds: ["101199580"], id: 10191 },
  { technicalIds: ["101199581"], id: 10190 },
  { technicalIds: ["101199584"], id: 10188 },
  { technicalIds: ["101199585"], id: 10166 },
  { technicalIds: ["101236779"], id: 10189 },
  { technicalIds: ["101252001"], id: 10129, terms: ["peugeot sao caetano", "peugeot"] },
  { technicalIds: ["101252001"], id: 10280, terms: ["jetour santo andre"] },
  { technicalIds: ["101252001"], id: 10289, terms: ["jetour sao caetano", "jetour scs", "jetour"] },
  { technicalIds: ["101252001"], id: 10300, terms: ["mg analia"] },
  { technicalIds: ["101252001"], id: 10295, terms: ["mg sao caetano", "mg motor", "mg"], fallbackId: 10295 }
] as const;

export type LeadmobRuleInput = {
  companyId?: string | number;
  departmentId?: string | number;
  originId?: string | number;
  form?: string;
  subject?: string;
  message?: string;
  unitName?: string;
  vehicle?: {
    brand?: string;
    store?: string;
    storeId?: string | number | null;
    city?: string;
    uf?: string;
  };
  meta?: Record<string, unknown>;
};

export type LeadmobDepartmentIntent = {
  fallbackId: number;
  aliases: string[];
};

export function normalizeForLeadmobMatch(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function onlyDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function matchesLeadmobTerm(candidate: string, term: string): boolean {
  const normalizedTerm = normalizeForLeadmobMatch(term);
  return candidate.includes(normalizedTerm) || normalizedTerm.includes(candidate);
}

function resolveLeadmobCompanyIdByName(candidates: string[]): number | null {
  for (const candidate of candidates) {
    const match = LEADMOB_COMPANIES_BY_UNIT.find((company) =>
      company.terms.some((term) => matchesLeadmobTerm(candidate, term))
    );
    if (match) return match.id;
  }

  return null;
}

function getTechnicalUnitCandidates(input: LeadmobRuleInput): string[] {
  const values = [
    input.unitName,
    input.vehicle?.storeId,
    input.meta?.unit_technical_id,
    input.meta?.store_id,
    input.meta?.storeId
  ];

  return Array.from(
    new Set(
      values
        .map(onlyDigits)
        .filter((value) => value.length >= 4)
    )
  );
}

function resolveLeadmobCompanyIdByTechnicalUnit(input: LeadmobRuleInput, nameCandidates: string[]): number | null {
  const technicalIds = getTechnicalUnitCandidates(input);
  if (!technicalIds.length) return null;

  const context = [
    ...nameCandidates,
    normalizeForLeadmobMatch(input.vehicle?.brand),
    normalizeForLeadmobMatch(input.vehicle?.city),
    normalizeForLeadmobMatch(input.vehicle?.uf),
    normalizeForLeadmobMatch(input.message)
  ].filter(Boolean).join(" ");

  for (const technicalId of technicalIds) {
    const rules = LEADMOB_COMPANIES_BY_TECHNICAL_UNIT.filter((rule) => rule.technicalIds.includes(technicalId));
    const contextualMatch = rules.find((rule) =>
      rule.terms?.some((term) => matchesLeadmobTerm(context, term))
    );
    if (contextualMatch) return contextualMatch.id;

    if (rules.length === 1) return rules[0].id;

    const fallback = rules.find((rule) => "fallbackId" in rule && rule.fallbackId === rule.id);
    if (fallback) return fallback.id;
  }

  return null;
}

export function resolveLeadmobCompanyId(input: LeadmobRuleInput): number {
  if (input.companyId) {
    const explicitCompanyId = Number(input.companyId);
    if (Number.isFinite(explicitCompanyId) && explicitCompanyId > 0) return explicitCompanyId;
  }

  const candidates = [
    input.unitName,
    input.vehicle?.store,
    input.vehicle?.brand && input.vehicle?.city ? `${input.vehicle.brand} ${input.vehicle.city}` : "",
    input.vehicle?.brand && input.vehicle?.uf ? `${input.vehicle.brand} ${input.vehicle.uf}` : ""
  ].map(normalizeForLeadmobMatch).filter(Boolean);

  const namedCompanyId = resolveLeadmobCompanyIdByName(candidates);
  if (namedCompanyId) return namedCompanyId;

  const technicalCompanyId = resolveLeadmobCompanyIdByTechnicalUnit(input, candidates);
  if (technicalCompanyId) return technicalCompanyId;

  return Number(LEADMOB_DEFAULT_EMPRESA);
}

export function resolveLeadmobDepartmentId(input: LeadmobRuleInput): number {
  return resolveLeadmobDepartmentIntent(input).fallbackId;
}

export function resolveLeadmobDepartmentIntent(input: LeadmobRuleInput): LeadmobDepartmentIntent {
  if (input.departmentId) {
    const explicitDepartmentId = Number(input.departmentId);
    if (Number.isFinite(explicitDepartmentId) && explicitDepartmentId > 0) {
      return { fallbackId: explicitDepartmentId, aliases: [] };
    }
  }

  return { fallbackId: Number(DEPARTAMENTO_SEMINOVOS), aliases: ["Veiculos Seminovos", "Seminovos"] };
}

export function resolveLeadmobOriginId(input: LeadmobRuleInput): number {
  if (input.originId) {
    const explicitOriginId = Number(input.originId);
    if (Number.isFinite(explicitOriginId) && explicitOriginId > 0) return explicitOriginId;
  }

  return Number(LEADMOB_DEFAULT_ORIGEM);
}

export function resolveLeadmobSuboriginLabel(input: LeadmobRuleInput): string {
  const source = normalizeForLeadmobMatch(`${input.form || ""} ${input.subject || ""} ${input.message || ""}`);

  if (source.includes("banco volks")) return "BANCO VOLKS";
  if (source.includes("ver parcelas") || source.includes("financiamento") || source.includes("simule seu financiamento")) return "VER PARCELAS";
  if (source.includes("anti saida") || source.includes("exit popup") || source.includes("popup")) return "POPUP ANTI SAIDA";
  if (source.includes("whatsapp")) return "WHATSAPP";
  if (source.includes("venda seu carro")) return "VENDA SEU CARRO";
  if (source.includes("contato")) return "FORMULARIO DE CONTATO";
  if (source.includes("proposta")) return "FORMULARIO DE PROPOSTA";

  return "SITE";
}

export function buildLeadmobCodePreview(input: LeadmobRuleInput) {
  const empresa = resolveLeadmobCompanyId(input);
  const departamento = resolveLeadmobDepartmentId(input);
  const origem = resolveLeadmobOriginId(input);
  const suborigem = resolveLeadmobSuboriginLabel(input);

  return {
    empresa,
    departamento,
    origem,
    origemDescricao: LEADMOB_DEFAULT_ORIGEM_LABEL,
    suborigemDescricao: suborigem,
    companyId: empresa,
    departmentId: departamento,
    originId: origem
  };
}
