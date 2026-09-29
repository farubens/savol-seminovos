import { LEADMOB_DEFAULT_ORIGEM_LABEL } from "@/lib/leadmobRules";

export type LeadTrackingPayload = {
  utm: Record<string, string | undefined>;
  meta: Record<string, string | undefined>;
};

const TRACKING_STORAGE_KEY = "savol-lead-tracking";
const GCLID_STORAGE_KEY = "savol-gclid";
const GCLID_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"] as const;

type StoredGclid = {
  value: string;
  expiryDate: number;
};

function readStoredTracking(): LeadTrackingPayload {
  if (typeof window === "undefined") return { utm: {}, meta: {} };
  try {
    const raw = window.localStorage.getItem(TRACKING_STORAGE_KEY) || window.sessionStorage.getItem(TRACKING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LeadTrackingPayload) : { utm: {}, meta: {} };
  } catch {
    return { utm: {}, meta: {} };
  }
}

function cleanTracking(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function getValidGclid(params: URLSearchParams): string | undefined {
  const gclidParam = cleanTracking(params.get("gclid"));
  const gclsrcParam = cleanTracking(params.get("gclsrc"));
  const isGclsrcValid = !gclsrcParam || gclsrcParam.toLocaleLowerCase().includes("aw");

  if (gclidParam && isGclsrcValid) {
    const record: StoredGclid = {
      value: gclidParam,
      expiryDate: Date.now() + GCLID_EXPIRY_MS
    };

    try {
      window.localStorage.setItem(GCLID_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Tracking is best effort.
    }

    return record.value;
  }

  try {
    const raw = window.localStorage.getItem(GCLID_STORAGE_KEY);
    if (!raw) return undefined;

    const record = JSON.parse(raw) as Partial<StoredGclid>;
    if (typeof record.value === "string" && typeof record.expiryDate === "number" && Date.now() < record.expiryDate) {
      return record.value;
    }

    window.localStorage.removeItem(GCLID_STORAGE_KEY);
  } catch {
    return undefined;
  }

  return undefined;
}

export function getLeadTrackingPayload(extraMeta: Record<string, string | number | boolean | null | undefined> = {}): LeadTrackingPayload {
  if (typeof window === "undefined") return { utm: {}, meta: {} };

  const stored = readStoredTracking();
  const params = new URLSearchParams(window.location.search);
  const utm = { ...stored.utm };
  delete utm.gclid;

  for (const key of UTM_KEYS) {
    if (key === "gclid") continue;
    const value = cleanTracking(params.get(key));
    if (value) utm[key === "fbclid" ? "id_facebook" : key] = value;
  }

  const gclid = getValidGclid(params);
  if (gclid) utm.gclid = gclid;

  const meta = {
    ...stored.meta,
    page_url: window.location.href,
    landing_page: stored.meta.landing_page || window.location.href,
    referrer: stored.meta.referrer || document.referrer || undefined,
    meta_plataforma: LEADMOB_DEFAULT_ORIGEM_LABEL,
    ...Object.fromEntries(Object.entries(extraMeta).map(([key, value]) => [key, value === undefined || value === null ? undefined : String(value)]))
  };

  const nextPayload = { utm, meta };

  try {
    const serialized = JSON.stringify(nextPayload);
    window.localStorage.setItem(TRACKING_STORAGE_KEY, serialized);
    window.sessionStorage.setItem(TRACKING_STORAGE_KEY, serialized);
  } catch {
    // Tracking is best effort.
  }

  return nextPayload;
}
