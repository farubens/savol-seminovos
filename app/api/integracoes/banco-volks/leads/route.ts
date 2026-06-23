import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { processFinancingLead, type FinancingLeadPayload } from "@/lib/financingLeads";

export const dynamic = "force-dynamic";

const VOLKS_LEADS_TOKEN = process.env.SAVOL_VOLKS_LEADS_TOKEN?.trim() || process.env.SAVOL_FINANCE_EXTERNAL_TOKEN?.trim() || "";
const VOLKS_SIGNING_SECRET = process.env.SAVOL_VOLKS_LEADS_SIGNING_SECRET?.trim() || "";
const MAX_BODY_BYTES = 128 * 1024;
const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

type SecurityCheckResult = {
  ok: boolean;
  status: number;
  error?: string;
};

function getBearerToken(request: NextRequest): string {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(request: NextRequest): SecurityCheckResult {
  if (!VOLKS_LEADS_TOKEN || !VOLKS_SIGNING_SECRET) {
    return { ok: false, status: 500, error: "Integracao nao configurada." };
  }

  const token = getBearerToken(request);
  if (!token || !safeCompare(token, VOLKS_LEADS_TOKEN)) {
    return { ok: false, status: 401, error: "Token invalido." };
  }

  return { ok: true, status: 200 };
}

function parseTimestamp(value: string | null): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) {
    const numeric = Number(value);
    return numeric > 9999999999 ? numeric : numeric * 1000;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSignature(value: string | null): string {
  return String(value || "").trim().replace(/^sha256=/i, "").toLowerCase();
}

function validateSignature(request: NextRequest, rawBody: string): SecurityCheckResult {
  const timestampHeader = request.headers.get("x-savol-timestamp");
  const receivedAt = parseTimestamp(timestampHeader);

  if (!receivedAt) {
    return { ok: false, status: 401, error: "Timestamp ausente ou invalido." };
  }

  if (Math.abs(Date.now() - receivedAt) > MAX_TIMESTAMP_SKEW_MS) {
    return { ok: false, status: 401, error: "Timestamp expirado." };
  }

  const signature = normalizeSignature(request.headers.get("x-savol-signature"));
  if (!signature) {
    return { ok: false, status: 401, error: "Assinatura ausente." };
  }

  const expectedSignature = crypto
    .createHmac("sha256", VOLKS_SIGNING_SECRET)
    .update(`${timestampHeader}.${rawBody}`)
    .digest("hex");

  if (!safeCompare(signature, expectedSignature)) {
    return { ok: false, status: 401, error: "Assinatura invalida." };
  }

  return { ok: true, status: 200 };
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false, error: "Content-Type deve ser application/json." }, { status: 415 });
  }

  const authCheck = isAuthorized(request);
  if (!authCheck.ok) {
    return NextResponse.json({ ok: false, error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Payload acima do limite de 128KB." }, { status: 413 });
    }

    const signatureCheck = validateSignature(request, rawBody);
    if (!signatureCheck.ok) {
      return NextResponse.json({ ok: false, error: signatureCheck.error }, { status: signatureCheck.status });
    }

    const payload = JSON.parse(rawBody) as FinancingLeadPayload;
    const result = await processFinancingLead(
      {
        ...payload,
        form: payload.form || "banco-volks-financiamento",
        subject: payload.subject || "Lead Banco Volks - Simule seu financiamento"
      },
      {
        referer: request.headers.get("referer"),
        userAgent: request.headers.get("user-agent"),
        sourceName: "banco-volks"
      }
    );

    return NextResponse.json(
      {
        ok: result.body.ok,
        protocol: result.body.protocol,
        status: result.body.ok ? "received" : "failed",
        error: result.body.error
      },
      { status: result.status }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Nao foi possivel processar o lead." }, { status: 400 });
  }
}
