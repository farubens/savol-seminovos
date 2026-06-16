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
  isFavorite: (vehicleId: number) => boolean;
  hasVisited: (vehicleId: number) => boolean;
  login: (user: SavolAccountUser) => void;
  logout: () => void;
  toggleFavorite: (vehicle: SavedVehicle) => boolean;
  registerVisit: (vehicle: SavedVehicle) => void;
};

const USER_KEY = "savol-account-user";
const FAVORITES_KEY = "savol-account-favorites";
const VISITED_KEY = "savol-account-visited";
const MAX_VISITED = 24;

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

export function SavolAccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SavolAccountUser | null>(null);
  const [favorites, setFavorites] = useState<SavedVehicle[]>([]);
  const [visited, setVisited] = useState<SavedVehicle[]>([]);

  useEffect(() => {
    setUser(readJson<SavolAccountUser | null>(USER_KEY, null));
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

  const isFavorite = useCallback((vehicleId: number) => favorites.some((vehicle) => vehicle.id === vehicleId), [favorites]);
  const hasVisited = useCallback((vehicleId: number) => visited.some((vehicle) => vehicle.id === vehicleId), [visited]);

  const login = useCallback((nextUser: SavolAccountUser) => {
    setUser({ name: nextUser.name.trim(), email: nextUser.email.trim().toLowerCase() });
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const toggleFavorite = useCallback(
    (vehicle: SavedVehicle) => {
      const exists = favorites.some((item) => item.id === vehicle.id);
      setFavorites((current) => (exists ? current.filter((item) => item.id !== vehicle.id) : uniqueByVehicleId([vehicle, ...current])));
      return !exists;
    },
    [favorites]
  );

  const registerVisit = useCallback((vehicle: SavedVehicle) => {
    setVisited((current) => {
      const next = uniqueByVehicleId([vehicle, ...current.filter((item) => item.id !== vehicle.id)]).slice(0, MAX_VISITED);
      if (current.length === next.length && current.every((item, index) => item.id === next[index]?.id)) return current;
      return next;
    });
  }, []);

  const value = useMemo<SavolAccountContextValue>(
    () => ({
      user,
      favorites,
      visited,
      isFavorite,
      hasVisited,
      login,
      logout,
      toggleFavorite,
      registerVisit
    }),
    [favorites, hasVisited, isFavorite, login, logout, registerVisit, toggleFavorite, user, visited]
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
