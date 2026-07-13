export const LEADMOB_DEFAULT_EMPRESA = "10104";
export const LEADMOB_DEFAULT_ORIGEM = "1";
export const LEADMOB_DEFAULT_ORIGEM_LABEL = "SITE SEMINOVOS";

const DEPARTAMENTO_SEMINOVOS = "2";

const LEADMOB_COMPANIES_BY_UNIT = [
  { id: 10104, terms: ["savol grupo", "atendimento savol", "sem preferencia", "unidade nao informada"] },
  { id: 10041, terms: ["savol toyota grupo", "toyota grupo"] },
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
  { id: 10280, terms: ["jetour santo andre", "savol jetour santo andre"] },
  { id: 10218, terms: ["consorcio"] },
  { id: 10224, terms: ["pos vendas", "pos venda"] },
  { id: 10216, terms: ["assinaturas", "assinatura"] }
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
    city?: string;
    uf?: string;
  };
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

  for (const candidate of candidates) {
    const match = LEADMOB_COMPANIES_BY_UNIT.find((company) =>
      company.terms.some((term) => {
        const normalizedTerm = normalizeForLeadmobMatch(term);
        return candidate.includes(normalizedTerm) || normalizedTerm.includes(candidate);
      })
    );
    if (match) return match.id;
  }

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
