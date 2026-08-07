const VEHICLE_ORIGIN_KEY = "savol-vehicle-navigation-origin";
const VEHICLE_SCROLL_KEY = "savol-vehicle-navigation-scroll";
const MAX_STATE_AGE_MS = 12 * 60 * 60 * 1000;

type VehicleNavigationOrigin = {
  sourceUrl: string;
  destinationPath: string;
  scrollX: number;
  scrollY: number;
  savedAt: number;
};

type VehicleScrollRestoration = Pick<VehicleNavigationOrigin, "sourceUrl" | "scrollX" | "scrollY" | "savedAt">;

function currentRelativeUrl(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function readStoredValue<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isFresh(savedAt: number): boolean {
  return Number.isFinite(savedAt) && Date.now() - savedAt <= MAX_STATE_AGE_MS;
}

export function rememberVehicleNavigation(destination: string): void {
  if (typeof window === "undefined") return;

  try {
    const destinationUrl = new URL(destination, window.location.href);
    if (destinationUrl.origin !== window.location.origin) return;

    const origin: VehicleNavigationOrigin = {
      sourceUrl: currentRelativeUrl(),
      destinationPath: destinationUrl.pathname,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      savedAt: Date.now()
    };

    window.sessionStorage.setItem(VEHICLE_ORIGIN_KEY, JSON.stringify(origin));
  } catch {
    // Navigation must continue even when browser storage is unavailable.
  }
}

export function getVehicleNavigationOrigin(): VehicleNavigationOrigin | null {
  if (typeof window === "undefined") return null;

  const origin = readStoredValue<VehicleNavigationOrigin>(VEHICLE_ORIGIN_KEY);
  if (!origin || !isFresh(origin.savedAt) || origin.destinationPath !== window.location.pathname) return null;
  return origin;
}

export function queueVehicleScrollRestoration(origin: VehicleNavigationOrigin): void {
  if (typeof window === "undefined") return;

  const sourcePath = new URL(origin.sourceUrl, window.location.origin).pathname;
  if (sourcePath !== "/veiculos" && sourcePath !== "/venda-para-lojistas") return;

  const restoration: VehicleScrollRestoration = {
    sourceUrl: origin.sourceUrl,
    scrollX: origin.scrollX,
    scrollY: origin.scrollY,
    savedAt: Date.now()
  };

  try {
    window.sessionStorage.setItem(VEHICLE_SCROLL_KEY, JSON.stringify(restoration));
  } catch {
    // The URL still preserves the catalog filters when storage is unavailable.
  }
}

export function getPendingVehicleScrollRestoration(): VehicleScrollRestoration | null {
  if (typeof window === "undefined") return null;

  const restoration = readStoredValue<VehicleScrollRestoration>(VEHICLE_SCROLL_KEY);
  if (!restoration || !isFresh(restoration.savedAt) || restoration.sourceUrl !== currentRelativeUrl()) return null;
  return restoration;
}

export function clearPendingVehicleScrollRestoration(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(VEHICLE_SCROLL_KEY);
}
