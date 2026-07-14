import type { LeadmobLeadInput, LeadmobVehicle } from "@/lib/leadmob";
import { resolveLeadmobCompanyId } from "@/lib/leadmobRules";
import type { LeadTrackingPayload } from "@/lib/leadTracking";

type VwfsLeadContext = {
  form: string;
  subject: string;
  unitName?: string;
  vehicle?: LeadmobVehicle;
  message?: string;
  tracking: LeadTrackingPayload;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

const NAME_KEYS = ["nome", "name", "customername", "clientname", "nomecliente", "leadname"];
const PHONE_KEYS = ["telefone", "phone", "celular", "whatsapp", "mobile", "fone", "leadphone"];
const EMAIL_KEYS = ["email", "e-mail", "mail", "leademail"];
const CPF_KEYS = ["cpf", "documento", "document", "taxid", "cnpjcpf"];

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "");
}

function walkValues(source: unknown, callback: (key: string, value: unknown) => string | null, depth = 0): string | null {
  if (!source || depth > 6) return null;

  if (Array.isArray(source)) {
    for (const item of source) {
      const match = walkValues(item, callback, depth + 1);
      if (match) return match;
    }
    return null;
  }

  if (typeof source !== "object") return null;

  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    const direct = callback(normalizeKey(key), value);
    if (direct) return direct;
    const nested = walkValues(value, callback, depth + 1);
    if (nested) return nested;
  }

  return null;
}

function findText(source: unknown, keys: string[]): string {
  const normalizedKeys = new Set(keys.map(normalizeKey));
  const match = walkValues(source, (key, value) => {
    if (!normalizedKeys.has(key)) return null;
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text || null;
  });
  return match || "";
}

function compactJson(value: unknown): string {
  try {
    return JSON.stringify(value).slice(0, 1500);
  } catch {
    return String(value ?? "").slice(0, 1500);
  }
}

function cleanDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function createBancoVolksLeadPayload(vwfsResult: unknown, context: VwfsLeadContext): LeadmobLeadInput | null {
  if (!vwfsResult || typeof vwfsResult !== "object") return null;

  const phone = findText(vwfsResult, PHONE_KEYS);
  if (cleanDigits(phone).length < 10) return null;

  const name = findText(vwfsResult, NAME_KEYS) || "Cliente Banco Volks";
  const email = findText(vwfsResult, EMAIL_KEYS) || "sem-email@savolseminovos.com.br";
  const cpf = findText(vwfsResult, CPF_KEYS);
  const payloadSnapshot = compactJson(vwfsResult);
  const companyId = resolveLeadmobCompanyId({
    unitName: context.unitName,
    vehicle: context.vehicle,
    meta: context.meta
  });

  return {
    form: context.form,
    subject: context.subject,
    name,
    phone,
    email,
    cpf,
    companyId,
    unitName: context.unitName,
    vehicle: context.vehicle,
    message: [context.message, "Lead recebido pelo simulador Banco Volks.", cpf ? `CPF: ${cpf}` : ""].filter(Boolean).join("\n"),
    utm: context.tracking.utm,
    meta: {
      ...context.tracking.meta,
      ...(context.meta || {}),
      source_integration: "banco-volks",
      suborigem_descricao: "BANCO VOLKS",
      vwfs_payload: payloadSnapshot,
      vwfs_email_informado: Boolean(findText(vwfsResult, EMAIL_KEYS))
    }
  };
}
