import { NextRequest, NextResponse } from "next/server";
import { processFinancingLead, type FinancingLeadPayload } from "@/lib/financingLeads";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as FinancingLeadPayload;
    const result = await processFinancingLead(payload, {
      referer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent"),
      sourceName: "site"
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Nao foi possivel processar o lead de financiamento." }, { status: 500 });
  }
}
