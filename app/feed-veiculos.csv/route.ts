import { NextRequest, NextResponse } from "next/server";
import { buildVehicleCsvFeed } from "@/lib/vehicleCsvFeed";
import type { ApiVehicle } from "@/types/home";

const SITE_BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.savolseminovos.com.br").replace(/\/+$/, "");
const FEED_CACHE_SECONDS = 5 * 60;

type VehicleApiResponse = {
  items?: ApiVehicle[];
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const vehicleApiUrl = new URL("/api/veiculos?per_page=200", request.nextUrl.origin);
  const response = await fetch(vehicleApiUrl, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Nao foi possivel gerar o feed de veiculos." }, { status: 502 });
  }

  const payload = (await response.json()) as VehicleApiResponse;
  const vehicles = Array.isArray(payload.items) ? payload.items : [];
  const csv = buildVehicleCsvFeed(vehicles, SITE_BASE_URL);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="feed-veiculos.csv"',
      "Cache-Control": `public, s-maxage=${FEED_CACHE_SECONDS}, stale-while-revalidate=${FEED_CACHE_SECONDS}`,
      "X-Content-Type-Options": "nosniff"
    }
  });
}
