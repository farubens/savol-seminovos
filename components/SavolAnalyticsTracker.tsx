"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const VISITOR_KEY = "savol_analytics_visitor_id";
const SESSION_KEY = "savol_analytics_session_id";
const WP_ANALYTICS_ENDPOINT = "https://palevioletred-lark-270684.hostingersite.com/wp-json/savol-painel/v1/analytics";
const FILTER_KEYS = [
  "stores",
  "store",
  "brands",
  "brand",
  "models",
  "model",
  "categories",
  "transmissions",
  "colors",
  "fuels",
  "bodies",
  "yearMin",
  "yearMax",
  "priceMin",
  "priceMax",
  "maxPrice",
  "kmMin",
  "kmMax",
  "sort"
];
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

type AnalyticsEvent = {
  event_type: "pageview" | "vehicle_view" | "whatsapp_click" | "financing_click" | "search" | "filter";
  page_url?: string;
  path?: string;
  referrer?: string;
  source?: string;
  vehicle_slug?: string;
  search_term?: string;
  filter_key?: string;
  filter_value?: string;
  meta?: Record<string, string>;
} & Partial<Record<(typeof UTM_KEYS)[number], string>>;

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function getStoredId(storage: Storage, key: string, prefix: string): string {
  const current = storage.getItem(key);
  if (current) return current;

  const next = makeId(prefix);
  storage.setItem(key, next);
  return next;
}

function sourceFromReferrer(referrer: string): string {
  if (!referrer) return "direto";

  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host || "referencia";
  } catch {
    return "referencia";
  }
}

function getBasePayload(): Pick<AnalyticsEvent, "page_url" | "path" | "referrer" | "source"> & {
  visitor_id: string;
  session_id: string;
} {
  return {
    visitor_id: getStoredId(window.localStorage, VISITOR_KEY, "vis"),
    session_id: getStoredId(window.sessionStorage, SESSION_KEY, "ses"),
    page_url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer,
    source: sourceFromReferrer(document.referrer)
  };
}

function getUtmPayload(params: URLSearchParams): Partial<Record<(typeof UTM_KEYS)[number], string>> {
  return UTM_KEYS.reduce<Partial<Record<(typeof UTM_KEYS)[number], string>>>((acc, key) => {
    const value = params.get(key)?.trim();
    if (value) acc[key] = value;
    return acc;
  }, {});
}

function sendAnalytics(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;

  const payload = {
    ...getBasePayload(),
    ...event
  };

  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true
  })
    .then((response) => {
      if (!response.ok) sendAnalyticsDirect(payload);
    })
    .catch(() => sendAnalyticsDirect(payload));
}

function sendAnalyticsDirect(payload: AnalyticsEvent & ReturnType<typeof getBasePayload>): void {
  fetch(WP_ANALYTICS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
    mode: "cors"
  }).catch(() => undefined);
}

export function SavolAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRouteKey = useRef("");

  useEffect(() => {
    if (!pathname) return;

    const search = searchParams.toString();
    const routeKey = `${pathname}?${search}`;
    if (lastRouteKey.current === routeKey) return;
    lastRouteKey.current = routeKey;

    const params = new URLSearchParams(search);
    const utm = getUtmPayload(params);
    sendAnalytics({ event_type: "pageview", ...utm });

    const vehicleMatch = pathname.match(/^\/veiculos\/([^/?#]+)/);
    if (vehicleMatch?.[1]) {
      sendAnalytics({ event_type: "vehicle_view", vehicle_slug: decodeURIComponent(vehicleMatch[1]), ...utm });
    }

    const searchTerm = params.get("q")?.trim();
    if (searchTerm) {
      sendAnalytics({ event_type: "search", search_term: searchTerm, ...utm });
    }

    FILTER_KEYS.forEach((key) => {
      const value = params.get(key)?.trim();
      if (!value) return;

      value.split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => {
        sendAnalytics({ event_type: "filter", filter_key: key, filter_value: item, ...utm });
      });
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(event: MouseEvent): void {
      const target = event.target instanceof Element ? event.target.closest("a,button") : null;
      if (!target) return;

      const href = target instanceof HTMLAnchorElement ? target.href : "";
      const text = `${target.textContent || ""} ${target.getAttribute("aria-label") || ""} ${target.className || ""}`.toLowerCase();
      const isWhatsApp = /wa\.me|whatsapp\.com|whatsapp/.test(`${href} ${text}`.toLowerCase());
      const isFinancing = /financiamento|financiar|simule|proposta/.test(`${href} ${text}`.toLowerCase());

      if (isWhatsApp) {
        sendAnalytics({ event_type: "whatsapp_click", meta: { href } });
        return;
      }

      if (isFinancing) {
        sendAnalytics({ event_type: "financing_click", meta: { href } });
      }
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return null;
}
