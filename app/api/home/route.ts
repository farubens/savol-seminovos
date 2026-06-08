import { NextRequest, NextResponse } from "next/server";
import type { ApiStore, ApiVehicle, HomeDataPayload } from "@/types/home";

const DEFAULT_VEHICLES_PER_PAGE = 24;
const MAX_VEHICLES_PER_PAGE = 200;
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

function toInt(value: string | null | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function fetchList<T>(url: string): Promise<T[]> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];

  const json = (await response.json()) as ApiListResponse<T>;
  return Array.isArray(json.items) ? json.items : [];
}

export async function GET(request: NextRequest) {
  try {
    const vehiclesPerPage = clamp(toInt(request.nextUrl.searchParams.get("vehicles_per_page"), DEFAULT_VEHICLES_PER_PAGE), 1, MAX_VEHICLES_PER_PAGE);
    const now = Date.now();
    if (homeCache && homeCache.expiresAt > now) {
      return NextResponse.json({
        ...homeCache.payload,
        vehicles: homeCache.payload.vehicles.slice(0, vehiclesPerPage)
      });
    }

    if (!homeInFlight) {
      const origin = request.nextUrl.origin;
      const vehiclesUrl = `${origin}/api/veiculos?per_page=${MAX_VEHICLES_PER_PAGE}`;
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
    return NextResponse.json({
      ...payload,
      vehicles: payload.vehicles.slice(0, vehiclesPerPage)
    });
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
