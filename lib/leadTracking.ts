export type LeadTrackingPayload = {
  utm: Record<string, string | undefined>;
  meta: Record<string, string | undefined>;
};

const TRACKING_STORAGE_KEY = "savol-lead-tracking";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"] as const;

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

export function getLeadTrackingPayload(extraMeta: Record<string, string | number | boolean | null | undefined> = {}): LeadTrackingPayload {
  if (typeof window === "undefined") return { utm: {}, meta: {} };

  const stored = readStoredTracking();
  const params = new URLSearchParams(window.location.search);
  const utm = { ...stored.utm };

  for (const key of UTM_KEYS) {
    const value = cleanTracking(params.get(key));
    if (value) utm[key === "fbclid" ? "id_facebook" : key] = value;
  }

  const meta = {
    ...stored.meta,
    page_url: window.location.href,
    landing_page: stored.meta.landing_page || window.location.href,
    referrer: stored.meta.referrer || document.referrer || undefined,
    meta_plataforma: "SITE SEMINOVOS",
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
