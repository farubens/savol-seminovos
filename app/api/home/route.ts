import { NextRequest, NextResponse } from "next/server";
import type { ApiStore, ApiVehicle, HomeDataPayload } from "@/types/home";

const VEHICLES_PER_PAGE = 24;
const STORES_PER_PAGE = 60;
const HOME_CACHE_TTL_MS = 2 * 60 * 1000;

type ApiListResponse<T> = {
  items?: T[];
};

type CachedHome = {
  payload: HomeDataPayload;
  expiresAt: number;
};

let homeCache: CachedHome | null = null;
let homeInFlight: Promise<HomeDataPayload> | null = null;

export const dynamic = "force-dynamic";

async function fetchList<T>(url: string): Promise<T[]> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];

  const json = (await response.json()) as ApiListResponse<T>;
  return Array.isArray(json.items) ? json.items : [];
}

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    if (homeCache && homeCache.expiresAt > now) {
      return NextResponse.json(homeCache.payload);
    }

    if (!homeInFlight) {
      const origin = request.nextUrl.origin;
      const vehiclesUrl = `${origin}/api/veiculos?per_page=${VEHICLES_PER_PAGE}`;
      const storesUrl = `${origin}/api/lojas?per_page=${STORES_PER_PAGE}`;

      homeInFlight = (async () => {
        const [vehicles, stores] = await Promise.all([
          fetchList<ApiVehicle>(vehiclesUrl),
          fetchList<ApiStore>(storesUrl)
        ]);

        const payload: HomeDataPayload = {
          vehicles,
          stores,
          fetchedAt: Date.now()
        };

        const hasContent = payload.vehicles.length > 0 || payload.stores.length > 0;
        homeCache = {
          payload,
          expiresAt: Date.now() + (hasContent ? HOME_CACHE_TTL_MS : 10 * 1000)
        };

        return payload;
      })()
        .catch(() => {
          return (
            homeCache?.payload ?? {
              vehicles: [],
              stores: [],
              fetchedAt: Date.now()
            }
          );
        })
        .finally(() => {
          homeInFlight = null;
        });
    }

    const payload = await homeInFlight;
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      homeCache?.payload ?? {
        vehicles: [],
        stores: [],
        fetchedAt: Date.now()
      }
    );
  }
}
