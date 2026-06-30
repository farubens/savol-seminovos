import crypto from "node:crypto";
import {
  createLeadmobRequestPayload,
  insertLeadmobLead,
  type LeadmobLeadInput,
  validateLeadmobInput
} from "@/lib/leadmob";

const TRACKING_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"] as const;

const DEFAULT_WP_BASE_URL =
  process.env.NODE_ENV === "production" ? "https://palevioletred-lark-270684.hostingersite.com" : "http://localhost/savol-seminovos-local";
const WP_BASE_URL = (process.env.WP_BASE_URL?.trim() || DEFAULT_WP_BASE_URL).replace(/\/+$/, "");
const WP_FINANCING_LEADS_ENDPOINT = `${WP_BASE_URL}/wp-json/savol/v1/financiamento-leads`;
const WP_FINANCING_LEADS_TOKEN =
  process.env.SAVOL_FINANCE_LEADS_TOKEN?.trim() || process.env.SAVOL_FINANCING_LEADS_TOKEN?.trim() || "";

export type FinancingLeadPayload = LeadmobLeadInput & {
  cpf?: string;
};

type FinancingLeadContext = {
  referer?: string | null;
  userAgent?: string | null;
  sourceName?: string;
};

type WordPressLeadResult = {
  ok: boolean;
  status: number;
  endpoint: string;
  response: unknown;
  skipped?: boolean;
  error?: string;
};

export type FinancingLeadProcessResult = {
  status: number;
  body: {
    ok: boolean;
    protocol?: string;
    request?: Record<string, unknown>;
    wordpress?: WordPressLeadResult;
    leadmob?: Awaited<ReturnType<typeof insertLeadmobLead>>;
    error?: string;
  };
};

function trackingFromUrl(value: string | null | undefined): Pick<LeadmobLeadInput, "utm" | "meta"> {
  if (!value) return { utm: {}, meta: {} };

  try {
    const url = new URL(value);
    const utm: Record<string, string | undefined> = {};
    for (const key of TRACKING_KEYS) {
      const param = url.searchParams.get(key)?.trim();
      if (param) utm[key === "fbclid" ? "id_facebook" : key] = param;
    }

    return {
      utm,
      meta: {
        page_url: value,
        referrer: value
      }
    };
  } catch {
    return { utm: {}, meta: { referrer: value } };
  }
}

function createProtocol(): string {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.randomInt(100000, 999999);
  return `SAVOL-FIN-${yyyymmdd}-${random}`;
}

function onlyDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function cleanCpf(value: unknown): string {
  return onlyDigits(value).slice(0, 11);
}

function isTechnicalUnitId(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return /^\d{4,}$/.test(text);
}

function cleanUnitName(value: unknown): string {
  return String(value ?? "").replace(/^loja:\s*/i, "").trim();
}

function resolveFinancingUnitName(payload: FinancingLeadPayload): string {
  const candidates = [
    payload.unitName,
    payload.vehicle?.store,
    payload.meta?.unitName,
    payload.meta?.unidade,
    payload.meta?.store,
    payload.meta?.store_name
  ];

  const namedCandidate = candidates
    .map(cleanUnitName)
    .find((value) => value.length > 0 && !isTechnicalUnitId(value));
  if (namedCandidate) return namedCandidate;

  const technicalId = candidates.find(isTechnicalUnitId);
  if (technicalId) return "Savol Seminovos - Simulador Banco Volkswagen";

  return "";
}

function normalizeFinancingPayload(payload: FinancingLeadPayload, context: FinancingLeadContext, protocol: string): LeadmobLeadInput {
  const fallbackTracking = trackingFromUrl(context.referer);
  const form = payload.form || "financiamento";
  const subject = payload.subject || "Simule seu financiamento";
  const cpf = cleanCpf(payload.cpf);
  const message = [payload.message, cpf ? `CPF: ${cpf}` : ""].filter(Boolean).join("\n");
  const submittedAt = new Date().toISOString();
  const unitName = resolveFinancingUnitName(payload);

  return {
    ...payload,
    protocol,
    form,
    subject,
    cpf,
    message,
    unitName,
    utm: {
      ...(fallbackTracking.utm || {}),
      ...(payload.utm || {})
    },
    meta: {
      ...(fallbackTracking.meta || {}),
      ...(payload.meta || {}),
      form,
      subject,
      source_integration: context.sourceName || payload.meta?.source_integration,
      page_url: payload.meta?.page_url || fallbackTracking.meta?.page_url,
      user_agent: context.userAgent || payload.meta?.user_agent,
      unit_name: unitName,
      unit_technical_id: isTechnicalUnitId(payload.unitName) ? String(payload.unitName).trim() : payload.meta?.unit_technical_id,
      submitted_at: submittedAt
    }
  };
}

async function sendLeadToWordPress(
  payload: LeadmobLeadInput,
  protocol: string,
  leadmobRequest: Record<string, unknown>,
  context: FinancingLeadContext
): Promise<WordPressLeadResult> {
  if (!WP_FINANCING_LEADS_TOKEN) {
    return {
      ok: false,
      status: 500,
      endpoint: WP_FINANCING_LEADS_ENDPOINT,
      response: null,
      skipped: true,
      error: "SAVOL_FINANCE_LEADS_TOKEN nao configurado."
    };
  }

  const response = await fetch(WP_FINANCING_LEADS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WP_FINANCING_LEADS_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      schemaVersion: "1.0",
      protocol,
      source: {
        form: payload.form,
        subject: payload.subject,
        channel: "site",
        integration: context.sourceName || "site",
        pageUrl: String(payload.meta?.page_url || payload.vehicle?.url || ""),
        referrer: String(payload.meta?.referrer || ""),
        userAgent: String(context.userAgent || payload.meta?.user_agent || ""),
        submittedAt: String(payload.meta?.submitted_at || new Date().toISOString())
      },
      lead: {
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        cpf: payload.cpf || "",
        message: payload.message || "",
        unitName: payload.unitName || payload.vehicle?.store || ""
      },
      vehicle: payload.vehicle || {},
      utm: payload.utm || {},
      meta: payload.meta || {},
      leadmobPreview: leadmobRequest
    }),
    cache: "no-store"
  });

  const responseText = await response.text();
  let responsePayload: unknown = responseText;
  try {
    responsePayload = JSON.parse(responseText);
  } catch {
    responsePayload = responseText;
  }

  return {
    ok: response.ok && Boolean((responsePayload as { ok?: boolean })?.ok ?? true),
    status: response.status,
    endpoint: WP_FINANCING_LEADS_ENDPOINT,
    response: responsePayload,
    error: response.ok ? undefined : "WordPress nao confirmou o cadastro do lead."
  };
}

export async function processFinancingLead(rawPayload: FinancingLeadPayload, context: FinancingLeadContext = {}): Promise<FinancingLeadProcessResult> {
  const protocol = createProtocol();
  const payload = normalizeFinancingPayload(rawPayload, context, protocol);
  const validationError = validateLeadmobInput(payload);

  if (validationError) {
    return {
      status: 400,
      body: { ok: false, error: validationError }
    };
  }

  const leadmobRequestPreview = createLeadmobRequestPayload(payload);
  const [wordpressResult, leadmobResult] = await Promise.all([
    sendLeadToWordPress(payload, protocol, leadmobRequestPreview, context),
    insertLeadmobLead(payload).catch((error) => ({
      ok: false,
      status: 502,
      request: leadmobRequestPreview,
      response: null,
      error: error instanceof Error ? error.message : "Leadmob indisponivel."
    }))
  ]);

  const ok = wordpressResult.ok || leadmobResult.ok;

  return {
    status: ok ? 200 : 502,
    body: {
      ok,
      protocol,
      request: leadmobResult.request || leadmobRequestPreview,
      wordpress: wordpressResult,
      leadmob: leadmobResult,
      error: ok ? undefined : "Nao foi possivel cadastrar o lead de financiamento."
    }
  };
}
