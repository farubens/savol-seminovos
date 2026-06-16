import { NextRequest, NextResponse } from "next/server";

const DEFAULT_WP_BASE_URL =
  process.env.NODE_ENV === "production" ? "https://palevioletred-lark-270684.hostingersite.com" : "http://localhost/savol-seminovos-local";
const WP_BASE_URL = (process.env.WP_BASE_URL?.trim() || DEFAULT_WP_BASE_URL).replace(/\/+$/, "");
const WP_REGISTER_ENDPOINT = `${WP_BASE_URL}/wp-json/savol/v1/customer/register`;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const response = await fetch(WP_REGISTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Erro ao cadastrar conta Savol no WordPress", error);
    return NextResponse.json({ message: "Não foi possível criar sua conta agora." }, { status: 500 });
  }
}
