"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApiStore, ApiVehicle, HomeDataPayload } from "@/types/home";

type HomeSessionDataContextValue = {
  vehicles: ApiVehicle[];
  stores: ApiStore[];
  loading: boolean;
};

const SESSION_KEY = "savol_home_payload_v3";
const HOME_API_URL = "/api/home";
const SESSION_CACHE_TTL_MS = 2 * 60 * 1000;

const HomeSessionDataContext = createContext<HomeSessionDataContextValue | null>(null);

function isValidPayload(value: unknown): value is HomeDataPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HomeDataPayload>;
  return Array.isArray(candidate.vehicles) && Array.isArray(candidate.stores) && typeof candidate.fetchedAt === "number";
}

export function HomeSessionDataProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<ApiVehicle[]>([]);
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cachedRaw = sessionStorage.getItem(SESSION_KEY);
    if (cachedRaw) {
      try {
        const cachedParsed = JSON.parse(cachedRaw) as unknown;
        if (isValidPayload(cachedParsed)) {
          const isFresh = Date.now() - cachedParsed.fetchedAt < SESSION_CACHE_TTL_MS;
          const hasContent = cachedParsed.vehicles.length > 0 || cachedParsed.stores.length > 0;
          if (hasContent) {
            setVehicles(cachedParsed.vehicles);
            setStores(cachedParsed.stores);
            setLoading(false);
          }
          if (isFresh && hasContent) {
            setLoading(false);
            return;
          }
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    fetch(HOME_API_URL, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: HomeDataPayload | null) => {
        if (!isValidPayload(payload)) {
          setVehicles([]);
          setStores([]);
          return;
        }

        setVehicles(payload.vehicles);
        setStores(payload.stores);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      })
      .catch(() => {
        setVehicles([]);
        setStores([]);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const value = useMemo<HomeSessionDataContextValue>(() => ({ vehicles, stores, loading }), [vehicles, stores, loading]);

  return <HomeSessionDataContext.Provider value={value}>{children}</HomeSessionDataContext.Provider>;
}

export function useHomeSessionData(): HomeSessionDataContextValue {
  const context = useContext(HomeSessionDataContext);
  if (!context) {
    throw new Error("useHomeSessionData precisa ser usado dentro de HomeSessionDataProvider.");
  }
  return context;
}
