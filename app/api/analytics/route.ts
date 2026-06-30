import { NextRequest, NextResponse } from "next/server";

const DEFAULT_WP_BASE_URL = "https://palevioletred-lark-270684.hostingersite.com";
const WP_BASE_URL = (process.env.WP_BASE_URL?.trim() || DEFAULT_WP_BASE_URL).replace(/\/+$/, "");
const ANALYTICS_ENDPOINT = `${WP_BASE_URL}/wp-json/savol-painel/v1/analytics`;

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal
    });

    return NextResponse.json({ ok: response.ok }, { status: response.ok ? 202 : 502 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
