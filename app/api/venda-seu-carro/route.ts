import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { insertLeadmobLead } from "@/lib/leadmob";

const REQUIRED_PHOTO_FIELDS = [
  "photo_vehicle",
  "photo_documentFront",
  "photo_documentBack"
];

const MAX_PHOTO_SIZE_BYTES = 1200 * 1024;
const SIGNING_SECRET = process.env.SELL_YOUR_CAR_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "dev-only-sell-your-car-secret";
const DEFAULT_WP_BASE_URL =
  process.env.NODE_ENV === "production" ? "https://palevioletred-lark-270684.hostingersite.com" : "http://localhost/savol-seminovos-local";
const WP_BASE_URL = (process.env.WP_BASE_URL?.trim() || DEFAULT_WP_BASE_URL).replace(/\/+$/, "");
const WP_SELL_YOUR_CAR_ENDPOINT = `${WP_BASE_URL}/wp-json/savol/v1/venda-seu-carro`;

export const dynamic = "force-dynamic";

type SellYourCarPayload = {
  schemaVersion?: string;
  source?: {
    form?: string;
    channel?: string;
    pageUrl?: string;
    userAgent?: string;
    submittedAt?: string;
  };
  utm?: Record<string, string | undefined>;
  meta?: Record<string, string | number | boolean | null | undefined>;
  vehicle?: Record<string, unknown>;
  seller?: {
    fullName?: string;
    email?: string;
    phone?: string;
    cpf?: string;
  };
  consents?: {
    acceptedTerms?: boolean;
    acceptedLgpd?: boolean;
    acceptedAt?: string;
  };
  photos?: Array<Record<string, unknown>>;
};

function createProtocol(): string {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.randomInt(100000, 999999);
  return `SAVOL-VSC-${yyyymmdd}-${random}`;
}

function signPayload(value: unknown): string {
  const serialized = JSON.stringify(value);
  return crypto.createHmac("sha256", SIGNING_SECRET).update(serialized).digest("hex");
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validatePayload(payload: SellYourCarPayload): string | null {
  if (payload.schemaVersion !== "1.0") return "Versão do payload inválida.";
  if (payload.source?.form !== "venda-seu-carro") return "Origem do formulário inválida.";
  if (!payload.vehicle) return "Dados do veículo não enviados.";

  const seller = payload.seller;
  if (!seller || !isNonEmpty(seller.fullName)) return "Nome do vendedor não enviado.";
  if (!isNonEmpty(seller.email) || !/^\S+@\S+\.\S+$/.test(seller.email)) return "E-mail do vendedor inválido.";
  if (!isNonEmpty(seller.phone) || seller.phone.replace(/[^\d]/g, "").length < 10) return "Telefone do vendedor inválido.";
  if (!isNonEmpty(seller.cpf) || seller.cpf.replace(/[^\d]/g, "").length !== 11) return "CPF do vendedor invalido.";

  if (!payload.consents?.acceptedTerms || !payload.consents?.acceptedLgpd) {
    return "Consentimentos obrigatórios não aceitos.";
  }

  if (!Array.isArray(payload.photos) || !REQUIRED_PHOTO_FIELDS.every((fieldName) => payload.photos?.some((photo) => photo.fieldName === fieldName))) {
    return "Metadados de fotos incompletos.";
  }

  return null;
}

function validatePhotos(formData: FormData): string | null {
  for (const fieldName of REQUIRED_PHOTO_FIELDS) {
    const value = formData.get(fieldName);
    if (!(value instanceof File)) return `Foto obrigatória ausente: ${fieldName}.`;
    if (!value.type.startsWith("image/")) return `Arquivo inválido em ${fieldName}.`;
    if (value.size > MAX_PHOTO_SIZE_BYTES) return `Foto acima de 8 MB em ${fieldName}.`;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const rawPayload = formData.get("payload");

    if (typeof rawPayload !== "string") {
      return NextResponse.json({ ok: false, error: "Payload JSON não enviado." }, { status: 400 });
    }

    const payload = JSON.parse(rawPayload) as SellYourCarPayload;
    const payloadError = validatePayload(payload);
    if (payloadError) return NextResponse.json({ ok: false, error: payloadError }, { status: 400 });

    const photoError = validatePhotos(formData);
    if (photoError) return NextResponse.json({ ok: false, error: photoError }, { status: 400 });

    const protocol = createProtocol();
    const seller = payload.seller;
    const vehicle = (payload.vehicle || {}) as Record<string, unknown>;
    const leadmobResult = await insertLeadmobLead({
      form: "venda-seu-carro",
      subject: "Venda seu carro",
      protocol,
      name: seller?.fullName || "",
      email: seller?.email || "",
      phone: seller?.phone || "",
      cpf: seller?.cpf || "",
      vehicle: {
        plate: String(vehicle.plate || "")
      },
      utm: payload.utm,
      meta: {
        ...(payload.meta || {}),
        page_url: payload.source?.pageUrl || payload.meta?.page_url,
        user_agent: payload.source?.userAgent || payload.meta?.user_agent,
        submitted_at: payload.source?.submittedAt || payload.meta?.submitted_at
      },
      ...{ vendaSeuCarroInternalMessage: [
        `CPF: ${seller?.cpf || ""}`,
        `Versão: ${vehicle.version || ""}`,
        `Ano fabricação: ${vehicle.manufactureYear || ""}`,
        `KM: ${vehicle.km || ""}`,
        `Cor: ${vehicle.color || ""}`,
        `Valor pretendido: ${vehicle.desiredPrice || ""}`
      ].join("\n") },
      message: `Placa: ${String(vehicle.plate || "")}`
    });

    const wpResponse = await fetch(WP_SELL_YOUR_CAR_ENDPOINT, {
      method: "POST",
      body: formData,
      cache: "no-store"
    });
    const wpPayload = (await wpResponse.json().catch(() => null)) as Record<string, unknown> | null;

    if (wpResponse.ok && wpPayload?.ok === true) {
      return NextResponse.json({
        ...wpPayload,
        proxiedToWordPress: true,
        wordpressEndpoint: WP_SELL_YOUR_CAR_ENDPOINT,
        leadmob: leadmobResult
      }, { status: wpResponse.status });
    }

    if (leadmobResult.ok) {
      return NextResponse.json({
        ok: true,
        protocol,
        proxiedToLeadmob: true,
        wordpressStatus: wpResponse.status,
        wordpressResponse: wpPayload,
        leadmob: leadmobResult
      });
    }

    const receivedAt = new Date().toISOString();
    const signedPayload = {
      ...payload,
      server: {
        protocol,
        receivedAt,
        photoCount: REQUIRED_PHOTO_FIELDS.length
      }
    };
    const token = signPayload(signedPayload);

    return NextResponse.json({
      ok: false,
      error: "WordPress não cadastrou o lead.",
      wordpressStatus: wpResponse.status,
      wordpressResponse: wpPayload,
      leadmob: leadmobResult,
      localValidation: {
        ok: true,
        message: "Payload e fotos passaram na validação do Next."
      },
      protocol,
      receivedAt,
      security: {
        tokenType: "hmac-sha256",
        token,
        signedFields: ["payload", "server.protocol", "server.receivedAt", "server.photoCount"]
      }
    }, { status: 502 });
  } catch {
    return NextResponse.json({ ok: false, error: "Não foi possível processar o envio." }, { status: 500 });
  }
}
