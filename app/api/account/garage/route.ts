import { NextRequest, NextResponse } from "next/server";

const DEFAULT_WP_BASE_URL =
  process.env.NODE_ENV === "production" ? "https://palevioletred-lark-270684.hostingersite.com" : "http://localhost/savol-seminovos-local";
const WP_BASE_URL = (process.env.WP_BASE_URL?.trim() || DEFAULT_WP_BASE_URL).replace(/\/+$/, "");
const WP_GARAGE_ENDPOINT = `${WP_BASE_URL}/wp-json/savol/v1/customer/garage`;

export const dynamic = "force-dynamic";

function getAuthHeaders(request: NextRequest): HeadersInit {
  const authorization = request.headers.get("authorization");
  return authorization ? { Authorization: authorization } : {};
}

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(WP_GARAGE_ENDPOINT, {
      headers: getAuthHeaders(request),
      cache: "no-store"
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Erro ao buscar garagem Savol no WordPress", error);
    return NextResponse.json({ message: "Não foi possível carregar favoritos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const response = await fetch(WP_GARAGE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(request)
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Erro ao salvar garagem Savol no WordPress", error);
    return NextResponse.json({ message: "Não foi possível salvar favoritos." }, { status: 500 });
  }
}
