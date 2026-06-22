import { NextRequest, NextResponse } from "next/server";
import { createLeadmobRequestPayload, insertLeadmobLead, type LeadmobLeadInput, validateLeadmobInput } from "@/lib/leadmob";

export const dynamic = "force-dynamic";

const TRACKING_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"] as const;

function trackingFromUrl(value: string | null): Pick<LeadmobLeadInput, "utm" | "meta"> {
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

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as LeadmobLeadInput;
    const fallbackTracking = trackingFromUrl(request.headers.get("referer"));
    const enrichedPayload: LeadmobLeadInput = {
      ...payload,
      utm: {
        ...(fallbackTracking.utm || {}),
        ...(payload.utm || {})
      },
      meta: {
        ...(fallbackTracking.meta || {}),
        ...(payload.meta || {})
      }
    };
    const validationError = validateLeadmobInput(enrichedPayload);

    if (validationError) {
      return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
    }

    const requestPayload = createLeadmobRequestPayload(enrichedPayload);

    try {
      const result = await insertLeadmobLead(enrichedPayload);
      return NextResponse.json(result, { status: result.ok ? 200 : result.status || 502 });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          status: 502,
          request: requestPayload,
          response: null,
          error: "Leadmob indisponível ou bloqueou a conexão."
        },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Não foi possível enviar o lead." }, { status: 500 });
  }
}
