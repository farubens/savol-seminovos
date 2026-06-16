"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ApiVehicle } from "@/types/home";

export type SavolAccountUser = {
  name: string;
  email: string;
};

export type SavedVehicle = Pick<
  ApiVehicle,
  | "id"
  | "slug"
  | "url"
  | "name"
  | "subtitle"
  | "image"
  | "gallery"
  | "year"
  | "transmission"
  | "fuel"
  | "km"
  | "store"
  | "oldPrice"
  | "price"
  | "qualityTag"
  | "secondaryHighlights"
> &
  Partial<Pick<ApiVehicle, "brand" | "model" | "version" | "color" | "city" | "uf" | "molicar" | "plate">>;

type SavolAccountContextValue = {
  user: SavolAccountUser | null;
  favorites: SavedVehicle[];
  visited: SavedVehicle[];
  favoriteIds: number[];
  visitedIds: number[];
  isSyncing: boolean;
  isFavorite: (vehicleId: number) => boolean;
  hasVisited: (vehicleId: number) => boolean;
  login: (user: SavolAccountUser) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  toggleFavorite: (vehicle: SavedVehicle) => boolean;
  registerVisit: (vehicle: SavedVehicle) => void;
};

const USER_KEY = "savol-account-user";
const TOKEN_KEY = "savol-account-token";
const FAVORITES_KEY = "savol-account-favorites";
const VISITED_KEY = "savol-account-visited";
const MAX_VISITED = 24;

type GaragePayload = {
  favorites?: number[];
  visited?: number[];
};

type SessionPayload = {
  user?: SavolAccountUser;
  token?: string;
  garage?: GaragePayload;
  message?: string;
};

const SavolAccountContext = createContext<SavolAccountContextValue | null>(null);

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function uniqueByVehicleId(items: SavedVehicle[]): SavedVehicle[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function uniqueIds(ids: number[]): number[] {
  return Array.from(new Set(ids.filter((id) => Number.isFinite(id) && id > 0)));
}

async function syncGarage(token: string, favorites: number[], visited: number[]) {
  await fetch("/api/account/garage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      favorites: uniqueIds(favorites),
      visited: uniqueIds(visited).slice(0, MAX_VISITED)
    })
  });
}

export function SavolAccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SavolAccountUser | null>(null);
  const [token, setToken] = useState("");
  const [favorites, setFavorites] = useState<SavedVehicle[]>([]);
  const [visited, setVisited] = useState<SavedVehicle[]>([]);
  const [remoteFavoriteIds, setRemoteFavoriteIds] = useState<number[]>([]);
  const [remoteVisitedIds, setRemoteVisitedIds] = useState<number[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setUser(readJson<SavolAccountUser | null>(USER_KEY, null));
    setToken(readJson<string>(TOKEN_KEY, ""));
    setFavorites(uniqueByVehicleId(readJson<SavedVehicle[]>(FAVORITES_KEY, [])));
    setVisited(uniqueByVehicleId(readJson<SavedVehicle[]>(VISITED_KEY, [])));
  }, []);

  useEffect(() => {
    writeJson(FAVORITES_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    writeJson(VISITED_KEY, visited);
  }, [visited]);

  useEffect(() => {
    if (user) {
      writeJson(USER_KEY, user);
    } else if (typeof window !== "undefined") {
      window.localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      writeJson(TOKEN_KEY, token);
    } else if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  const favoriteIds = useMemo(() => uniqueIds([...remoteFavoriteIds, ...favorites.map((vehicle) => vehicle.id)]), [favorites, remoteFavoriteIds]);
  const visitedIds = useMemo(() => uniqueIds([...remoteVisitedIds, ...visited.map((vehicle) => vehicle.id)]).slice(0, MAX_VISITED), [remoteVisitedIds, visited]);

  useEffect(() => {
    if (!token) return;
    setIsSyncing(true);
    syncGarage(token, favoriteIds, visitedIds)
      .catch((error) => console.error("Erro ao sincronizar garagem Savol", error))
      .finally(() => setIsSyncing(false));
  }, [favoriteIds, token, visitedIds]);

  const isFavorite = useCallback((vehicleId: number) => favoriteIds.includes(vehicleId), [favoriteIds]);
  const hasVisited = useCallback((vehicleId: number) => visitedIds.includes(vehicleId), [visitedIds]);

  const login = useCallback(
    async (nextUser: SavolAccountUser) => {
      setIsSyncing(true);
      try {
        const response = await fetch("/api/account/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: nextUser.name.trim(),
            email: nextUser.email.trim().toLowerCase()
          })
        });

        const payload = (await response.json().catch(() => ({}))) as SessionPayload;

        if (!response.ok || !payload.user || !payload.token) {
          return { ok: false, message: payload.message || "Não foi possível entrar agora." };
        }

        const nextFavorites = uniqueIds([...(payload.garage?.favorites ?? []), ...favorites.map((vehicle) => vehicle.id)]);
        const nextVisited = uniqueIds([...(payload.garage?.visited ?? []), ...visited.map((vehicle) => vehicle.id)]).slice(0, MAX_VISITED);

        setUser(payload.user);
        setToken(payload.token);
        setRemoteFavoriteIds(nextFavorites);
        setRemoteVisitedIds(nextVisited);

        await syncGarage(payload.token, nextFavorites, nextVisited);
        return { ok: true };
      } catch (error) {
        console.error("Erro ao entrar na conta Savol", error);
        return { ok: false, message: "Não foi possível acessar o WordPress agora." };
      } finally {
        setIsSyncing(false);
      }
    },
    [favorites, visited]
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken("");
    setRemoteFavoriteIds([]);
    setRemoteVisitedIds([]);
  }, []);

  const toggleFavorite = useCallback(
    (vehicle: SavedVehicle) => {
      const exists = favoriteIds.includes(vehicle.id);
      setFavorites((current) => (exists ? current.filter((item) => item.id !== vehicle.id) : uniqueByVehicleId([vehicle, ...current])));
      setRemoteFavoriteIds((current) => (exists ? current.filter((id) => id !== vehicle.id) : uniqueIds([vehicle.id, ...current])));
      return !exists;
    },
    [favoriteIds]
  );

  const registerVisit = useCallback((vehicle: SavedVehicle) => {
    setVisited((current) => {
      const next = uniqueByVehicleId([vehicle, ...current.filter((item) => item.id !== vehicle.id)]).slice(0, MAX_VISITED);
      if (current.length === next.length && current.every((item, index) => item.id === next[index]?.id)) return current;
      return next;
    });
    setRemoteVisitedIds((current) => uniqueIds([vehicle.id, ...current.filter((id) => id !== vehicle.id)]).slice(0, MAX_VISITED));
  }, []);

  const value = useMemo<SavolAccountContextValue>(
    () => ({
      user,
      favorites,
      visited,
      favoriteIds,
      visitedIds,
      isSyncing,
      isFavorite,
      hasVisited,
      login,
      logout,
      toggleFavorite,
      registerVisit
    }),
    [favoriteIds, favorites, hasVisited, isFavorite, isSyncing, login, logout, registerVisit, toggleFavorite, user, visited, visitedIds]
  );

  return <SavolAccountContext.Provider value={value}>{children}</SavolAccountContext.Provider>;
}

export function useSavolAccount() {
  const context = useContext(SavolAccountContext);
  if (!context) {
    throw new Error("useSavolAccount must be used inside SavolAccountProvider");
  }
  return context;
}
