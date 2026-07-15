"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FinanceFollowUpModal } from "@/components/FinanceFollowUpModal";
import { VehicleOfferCard } from "@/components/VehicleOfferCard";
import { MapDirectionsModal } from "@/components/MapDirectionsModal";
import { logLeadmobResponse, logLeadPayload } from "@/lib/leadDebug";
import { getLeadTrackingPayload } from "@/lib/leadTracking";
import { resolveLeadmobCompanyId } from "@/lib/leadmobRules";
import { resolveSavolTechnicalStoreIdFromParts } from "@/lib/savolStores";
import { resolveSavolWhatsAppPhoneFromParts } from "@/lib/savolWhatsApp";
import { parseCurrencyToInteger } from "@/utils/pricing";
import { hasVisibleVwfsSurface, watchVwfsSimulatorClose } from "@/utils/vwfsModalWatcher";
import { createBancoVolksLeadPayload } from "@/utils/vwfsLeadPayload";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Gauge,
  GitBranch,
  Heart,
  LoaderCircle,
  MapPin,
  Printer,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  WalletCards,
  X
} from "lucide-react";
import { type SavedVehicle, useSavolAccount } from "@/components/SavolAccountProvider";
import type { ApiVehicle } from "@/types/home";

type Props = {
  slug: string;
};

type VehicleApiResponse = {
  items?: ApiVehicle[];
};

type GalleryApiResponse = {
  gallery?: string[];
};

type StoreItem = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  address: string;
  phone: string;
  mapUrl: string;
};

type StoreApiResponse = {
  items?: StoreItem[];
};

const STORE_UNIT_ALIAS_GROUPS = [
  ["mg motor", "mg"],
  ["jetour"],
  ["fiat"],
  ["peugeot"],
  ["citroen", "citro"],
  ["kia"],
  ["toyota"],
  ["volkswagen", "volks", "vw"]
];

type LeadForm = {
  name: string;
  interest: string;
  phone: string;
  email: string;
  message: string;
  consent: boolean;
};

type DetailsTab = "sobre" | "opcionais" | "ficha" | "financiamento" | "loja";

const FALLBACK_IMAGE = "/images/em-preparacao.jpg";
const PREPARATION_IMAGE_TOKEN = "/images/em-preparacao";
const VWFS_DEFAULT_SCRIPT = "https://seller.vwfsbrasil.com.br/partners/simulator.js";
const VWFS_DEFAULT_CLIENT_KEY = "A7a4bq5l8zEVvP0wNR9wvkMmxrYWJZ6d1OjXDnBy";
const VWFS_DEFAULT_CLIENT_TOKEN = "73697e9cda39da51b4fe07dfd94d5389a630670759a3dced21444ad8bfb25fab";
const VWFS_DEFAULT_STORE_ID = 123454;
const VWFS_PRELOAD_DELAY_MS = 1200;
const VWFS_LOAD_FALLBACK_MS = 7000;
const FALLBACK_HIGHLIGHT = "Oportunidade";
const HIGHLIGHT_PRIORITY: Record<string, number> = {
  repasse: 90,
  garantia: 80,
  "unico dono": 70,
  "baixa km": 60,
  "abaixo fipe": 50,
  impecavel: 40,
  completo: 30,
  oportunidade: 0
};

let vwfsScriptPromise: Promise<boolean> | null = null;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStoreMatchText(value: string): string {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function getStoreUnitAliases(value: string): string[] {
  const normalized = normalizeStoreMatchText(value);
  return STORE_UNIT_ALIAS_GROUPS.find((aliases) => aliases.some((alias) => normalized.includes(alias))) ?? [];
}

function matchesStoreUnitAliases(value: string, aliases: string[]): boolean {
  const normalized = normalizeStoreMatchText(value);
  return aliases.some((alias) => normalized.includes(normalizeStoreMatchText(alias)));
}

function resolveHighlightTone(value: string): "repasse" | "garantia" | "unico-dono" | "baixa-km" | "fipe" | "impecavel" | "completo" | "default" {
  const normalized = normalize(value);
  if (normalized.includes("repasse")) return "repasse";
  if (normalized.includes("garantia")) return "garantia";
  if (normalized.includes("unico dono")) return "unico-dono";
  if (normalized.includes("baixa km")) return "baixa-km";
  if (normalized.includes("abaixo") && normalized.includes("fipe")) return "fipe";
  if (normalized.includes("impecavel")) return "impecavel";
  if (normalized.includes("completo")) return "completo";
  return "default";
}

function resolveHighlightPriority(value: string): number {
  const normalized = normalize(value);
  if (normalized.includes("repasse")) return HIGHLIGHT_PRIORITY.repasse;
  if (normalized.includes("garantia")) return HIGHLIGHT_PRIORITY.garantia;
  if (normalized.includes("unico dono")) return HIGHLIGHT_PRIORITY["unico dono"];
  if (normalized.includes("baixa km")) return HIGHLIGHT_PRIORITY["baixa km"];
  if (normalized.includes("abaixo") && normalized.includes("fipe")) return HIGHLIGHT_PRIORITY["abaixo fipe"];
  if (normalized.includes("impecavel")) return HIGHLIGHT_PRIORITY.impecavel;
  if (normalized.includes("completo")) return HIGHLIGHT_PRIORITY.completo;
  if (normalized.includes("oportunidade")) return HIGHLIGHT_PRIORITY.oportunidade;
  return 10;
}

function resolveOrderedHighlights(qualityTag?: string, secondaryHighlights: string[] = []): string[] {
  const seen = new Set<string>();
  const highlights = [qualityTag || "", ...secondaryHighlights]
    .map((highlight) => highlight.trim())
    .filter(Boolean)
    .filter((highlight) => {
      const key = normalize(highlight);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => resolveHighlightPriority(right) - resolveHighlightPriority(left));

  return highlights.length ? highlights : [FALLBACK_HIGHLIGHT];
}

function resolveHighlightIcon(value: string) {
  const tone = resolveHighlightTone(value);
  if (tone === "repasse") return Tag;
  if (tone === "garantia") return ShieldCheck;
  if (tone === "unico-dono") return UserRound;
  if (tone === "baixa-km") return Gauge;
  if (tone === "fipe") return WalletCards;
  if (tone === "impecavel") return Sparkles;
  if (tone === "completo") return CheckCircle2;
  return BadgeCheck;
}

function parseMoney(value: string): number | null {
  return parseCurrencyToInteger(value);
}

function toVwfsMoney(value: string): string {
  const numeric = parseMoney(value);
  if (!numeric || numeric <= 0) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numeric);
}

function parseVehicleYears(value: string): { manufactureAt: number; modelYear: number } {
  const matches = value.match(/(19|20)\d{2}/g) ?? [];
  const manufactureAt = Number(matches[0]) || new Date().getFullYear();
  const modelYear = Number(matches[1]) || manufactureAt;
  return { manufactureAt, modelYear };
}

function resolveCarType(text: string): "AUTOMOVEIS" | "UTILITARIOS" {
  const normalized = normalize(text);
  if (/\b(van|furgao|furgão|utilitario|utilitário|pickup|picape)\b/.test(normalized)) return "UTILITARIOS";
  return "AUTOMOVEIS";
}

function normalizeMolicar(value: string): string {
  return value.replace(/[^0-9-]/g, "").trim();
}

function normalizePlateValue(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function getPlateEndingDigit(value: string | null | undefined): string {
  const matches = (value ?? "").match(/\d/g);
  return matches?.at(-1) ?? "";
}

function ensureVwfsYieldContainer() {
  if (typeof document === "undefined") return;
  if (document.getElementById("bvfs-yield")) return;
  const container = document.createElement("div");
  container.id = "bvfs-yield";
  container.innerHTML = '<div class="vw"></div>';
  document.body.appendChild(container);
}

function loadVwfsScript(src: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.bvfs?.simulator) return Promise.resolve(true);
  if (vwfsScriptPromise) return vwfsScriptPromise;

  vwfsScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-vwfs="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.bvfs?.simulator)), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.dataset.vwfs = src;
    script.onload = () => resolve(Boolean(window.bvfs?.simulator));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return vwfsScriptPromise;
}

function removeStorePrefix(value: string): string {
  return value.replace(/^loja:\s*/i, "").replace(/^unidade\s+savol\s+/i, "savol ").trim();
}

function getStoreMatch(storeName: string, stores: StoreItem[], vehicle?: ApiVehicle | null): StoreItem | null {
  const normalizedVehicleStore = normalizeStoreMatchText(removeStorePrefix(storeName));
  if (!normalizedVehicleStore) return null;

  const storeUnitAliases = getStoreUnitAliases(storeName);
  const vehicleCity = normalizeStoreMatchText(vehicle?.city ?? "");

  const exactMatch = stores.find((store) => {
    const normalizedStore = normalizeStoreMatchText(removeStorePrefix(store.name));
    return normalizedStore === normalizedVehicleStore || normalizedStore.includes(normalizedVehicleStore) || normalizedVehicleStore.includes(normalizedStore);
  });
  if (exactMatch) return exactMatch;

  const scoredMatches = stores
    .map((store) => {
      const normalizedStoreIdentity = normalizeStoreMatchText(`${store.brand} ${store.name}`);
      const normalizedStore = normalizeStoreMatchText(`${store.brand} ${store.name} ${store.address}`);
      let score = 0;
      if (storeUnitAliases.length) {
        if (!matchesStoreUnitAliases(normalizedStoreIdentity, storeUnitAliases)) {
          return { store, score: -1 };
        }
        score += 20;
      }
      if (vehicleCity && normalizedStore.includes(vehicleCity)) score += 4;
      for (const token of normalizedVehicleStore.split(" ").filter((item) => item.length > 2)) {
        if (normalizedStore.includes(token)) score += 1;
      }
      return { store, score };
    })
    .filter((item) => item.score >= 5)
    .sort((a, b) => b.score - a.score);

  return scoredMatches[0]?.store ?? null;
}

function resolveFallbackStorePhone(vehicle?: ApiVehicle | null): string {
  return resolveSavolWhatsAppPhoneFromParts([vehicle?.store]);
}

function inferCategoryLabel(vehicle: ApiVehicle): string {
  const source = normalize(`${vehicle.name} ${vehicle.model} ${vehicle.version}`);
  if (source.includes("suv") || source.includes("crossover")) return "SUV";
  if (source.includes("hatch")) return "Hatch";
  if (source.includes("sedan")) return "Sedan";
  if (source.includes("picape") || source.includes("pickup") || source.includes("caminhonete")) return "Picape";
  return "Seminovos";
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, "").slice(0, 11);
}

function isUnknownValue(value: string): boolean {
  const normalized = normalize(value);
  return !normalized || normalized.includes("nao informado") || normalized.includes("sob consulta");
}

function isPreparationImage(src: string): boolean {
  return src.toLowerCase().includes(PREPARATION_IMAGE_TOKEN);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function toSavedVehicle(vehicle: ApiVehicle): SavedVehicle {
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    url: vehicle.url,
    absoluteUrl: vehicle.absoluteUrl,
    name: vehicle.name,
    subtitle: vehicle.subtitle,
    image: vehicle.image,
    gallery: vehicle.gallery,
    year: vehicle.year,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    km: vehicle.km,
    store: vehicle.store,
    storeId: vehicle.storeId,
    oldPrice: vehicle.oldPrice,
    price: vehicle.price,
    qualityTag: vehicle.qualityTag,
    secondaryHighlights: vehicle.secondaryHighlights,
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version,
    color: vehicle.color,
    city: vehicle.city,
    uf: vehicle.uf,
    molicar: vehicle.molicar,
    plate: vehicle.plate,
    armored: vehicle.armored,
    negotiating: vehicle.negotiating
  };
}

export function VehicleDetailsPageClient({ slug }: Props) {
  const { isFavorite, registerVisit, toggleFavorite } = useSavolAccount();
  const [vehicle, setVehicle] = useState<ApiVehicle | null>(null);
  const [storeItem, setStoreItem] = useState<StoreItem | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [gallery, setGallery] = useState<string[]>([]);
  const [slideDirection, setSlideDirection] = useState(1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedAction, setCopiedAction] = useState(false);
  const [detailsTab, setDetailsTab] = useState<DetailsTab>("sobre");
  const [relatedVehicles, setRelatedVehicles] = useState<ApiVehicle[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const [leadForm, setLeadForm] = useState<LeadForm>({
    name: "",
    interest: "",
    phone: "",
    email: "",
    message: "",
    consent: true
  });
  const [leadErrors, setLeadErrors] = useState<Record<string, string>>({});
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [isLeadSubmitting, setIsLeadSubmitting] = useState(false);
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);
  const [isOpeningFinanceSimulator, setIsOpeningFinanceSimulator] = useState(false);
  const [isFinanceFollowUpOpen, setIsFinanceFollowUpOpen] = useState(false);

  const thumbsRef = useRef<HTMLDivElement | null>(null);
  const vwfsCloseWatcherRef = useRef<(() => void) | null>(null);
  const financeFollowUpOpenedRef = useRef(false);
  const vwfsLoadFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vwfsOpenAttemptRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    let isActive = true;

    setLoadingVehicle(true);
    setVehicle(null);

    fetch(`/api/veiculos?slug=${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: VehicleApiResponse | null) => {
        if (!isActive) return;
        const firstVehicle = payload?.items?.[0] ?? null;
        setVehicle(firstVehicle);
        if (firstVehicle) {
          setGallery(Array.from(new Set([firstVehicle.image, ...firstVehicle.gallery].filter(Boolean))));
          setLeadForm((current) => ({ ...current, interest: firstVehicle.name }));
        }
      })
      .catch((error: unknown) => {
        if (!isAbortError(error) && isActive) setVehicle(null);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (isActive) setLoadingVehicle(false);
      });

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      if (!controller.signal.aborted) controller.abort();
    };
  }, [slug]);

  useEffect(() => {
    if (isPreparationImage(vehicle?.image ?? "")) return;
    if (!vehicle?.id) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 9000);
    let isActive = true;
    setLoadingGallery(true);

    fetch(`/api/veiculos/${vehicle.id}/galeria`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: GalleryApiResponse | null) => {
        if (!isActive) return;
        const remoteGallery = Array.isArray(payload?.gallery) ? payload.gallery.filter(Boolean) : [];
        if (remoteGallery.length) {
          setGallery(Array.from(new Set(remoteGallery)));
        }
      })
      .catch((error: unknown) => {
        if (!isAbortError(error) && isActive) setGallery((current) => current);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (isActive) setLoadingGallery(false);
      });

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      if (!controller.signal.aborted) controller.abort();
    };
  }, [vehicle?.id, vehicle?.image]);

  useEffect(() => {
    if (!vehicle?.store) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 9000);
    let isActive = true;

    fetch("/api/lojas?per_page=30", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: StoreApiResponse | null) => {
        if (!isActive) return;
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const matchedStore = getStoreMatch(vehicle.store, items, vehicle);
        setStoreItem(matchedStore);
      })
      .catch((error: unknown) => {
        if (!isAbortError(error) && isActive) setStoreItem(null);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      if (!controller.signal.aborted) controller.abort();
    };
  }, [vehicle?.store]);

  useEffect(() => {
    if (!vehicle?.id) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 9000);
    let isActive = true;
    setLoadingRelated(true);

    fetch("/api/veiculos?per_page=24", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: VehicleApiResponse | null) => {
        if (!isActive) return;
        const all = Array.isArray(payload?.items) ? payload.items : [];
        const others = all.filter((item) => item.id !== vehicle.id);
        const sameBrand = others.filter((item) => normalize(item.brand) === normalize(vehicle.brand));
        const sameCategory = others.filter(
          (item) => normalize(item.brand) !== normalize(vehicle.brand) && inferCategoryLabel(item) === inferCategoryLabel(vehicle)
        );
        const fallback = others.filter(
          (item) => normalize(item.brand) !== normalize(vehicle.brand) && inferCategoryLabel(item) !== inferCategoryLabel(vehicle)
        );

        setRelatedVehicles([...sameBrand, ...sameCategory, ...fallback].slice(0, 3));
      })
      .catch((error: unknown) => {
        if (!isAbortError(error) && isActive) setRelatedVehicles([]);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (isActive) setLoadingRelated(false);
      });

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      if (!controller.signal.aborted) controller.abort();
    };
  }, [vehicle?.id]);

  useEffect(() => {
    if (!gallery.length) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex > gallery.length - 1) {
      setSelectedIndex(0);
    }
  }, [gallery, selectedIndex]);

  useEffect(() => {
    if (!vehicle) return;
    registerVisit(toSavedVehicle(vehicle));
  }, [registerVisit, vehicle]);

  useEffect(() => {
    return () => {
      if (vwfsCloseWatcherRef.current) {
        vwfsCloseWatcherRef.current();
        vwfsCloseWatcherRef.current = null;
      }
      if (vwfsLoadFallbackTimerRef.current) {
        clearTimeout(vwfsLoadFallbackTimerRef.current);
        vwfsLoadFallbackTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLightboxOpen(false);
      if (event.key === "ArrowLeft") goToPrevImage();
      if (event.key === "ArrowRight") goToNextImage();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isLightboxOpen]);

  const isPreparationFallback = useMemo(() => isPreparationImage(vehicle?.image ?? FALLBACK_IMAGE), [vehicle?.image]);
  const activeImage = useMemo(
    () => (isPreparationFallback ? vehicle?.image || FALLBACK_IMAGE : gallery[selectedIndex] ?? vehicle?.image ?? FALLBACK_IMAGE),
    [gallery, isPreparationFallback, selectedIndex, vehicle?.image]
  );
  const galleryItems = useMemo(
    () => (isPreparationFallback ? [vehicle?.image || FALLBACK_IMAGE] : gallery.length ? gallery : [vehicle?.image || FALLBACK_IMAGE]),
    [gallery, isPreparationFallback, vehicle?.image]
  );
  const isCurrentVehicleFavorite = vehicle ? isFavorite(vehicle.id) : false;

  const breadcrumbCategory = vehicle ? inferCategoryLabel(vehicle) : "";
  const storeTitle = removeStorePrefix(vehicle?.store ?? "Unidade SAVOL");
  const resolvedStoreId =
    vehicle?.storeId || resolveSavolTechnicalStoreIdFromParts([storeTitle]) || Number(process.env.NEXT_PUBLIC_VWFS_STORE_ID ?? String(VWFS_DEFAULT_STORE_ID));
  const storeAddress = storeItem?.address || (!isUnknownValue(vehicle?.city ?? "") ? `${vehicle?.city} - ${vehicle?.uf}` : "Endereço sob consulta");
  const storePhone = storeItem?.phone || resolveFallbackStorePhone(vehicle);
  const plateEndingDigit = getPlateEndingDigit(vehicle?.plate);
  const leadVehicleContext = useMemo(
    () => ({
      id: vehicle?.id,
      plate: vehicle?.plate,
      brand: vehicle?.brand,
      model: vehicle?.model || vehicle?.name,
      version: vehicle?.version || vehicle?.subtitle,
      subtitle: vehicle?.subtitle,
      year: vehicle?.year?.slice(0, 4),
      km: vehicle?.km,
      color: vehicle?.color,
      fuel: vehicle?.fuel,
      transmission: vehicle?.transmission,
      price: vehicle?.price,
      oldPrice: vehicle?.oldPrice,
      store: storeTitle,
      storeId: resolvedStoreId,
      city: vehicle?.city,
      uf: vehicle?.uf,
      image: vehicle?.image,
      gallery: galleryItems,
      url: vehicle?.absoluteUrl || (typeof window !== "undefined" ? window.location.href : vehicle?.url),
      molicar: vehicle?.molicar
    }),
    [galleryItems, resolvedStoreId, storeTitle, vehicle]
  );

  useEffect(() => {
    if (!vehicle || typeof window === "undefined") return;
    window.sessionStorage.setItem(
      "savol-current-vehicle-lead-context",
      JSON.stringify({
        unitName: storeTitle,
        phone: storePhone,
        vehicle: leadVehicleContext,
        vehicleName: vehicle.name,
        pageUrl: window.location.href
      })
    );
  }, [leadVehicleContext, storePhone, storeTitle, vehicle]);
  const orderedHighlights = vehicle ? resolveOrderedHighlights(vehicle.qualityTag, vehicle.secondaryHighlights) : [];
  const displayQualityTag = orderedHighlights[0] || "";
  const secondaryHighlights = orderedHighlights.slice(1);
  const vwfsClientKey = process.env.NEXT_PUBLIC_VWFS_CLIENT_KEY?.trim() || VWFS_DEFAULT_CLIENT_KEY;
  const vwfsClientToken = process.env.NEXT_PUBLIC_VWFS_CLIENT_TOKEN?.trim() || VWFS_DEFAULT_CLIENT_TOKEN;
  const vwfsScriptSrc = process.env.NEXT_PUBLIC_VWFS_SCRIPT_SRC?.trim() || VWFS_DEFAULT_SCRIPT;

  useEffect(() => {
    if (!vehicle || typeof window === "undefined") return;

    const normalizedMolicar = normalizeMolicar(vehicle.molicar ?? "");
    const normalizedPlate = normalizePlateValue(vehicle.plate ?? "");
    const carValue = toVwfsMoney(vehicle.price);

    if (!vwfsClientKey || !vwfsClientToken || resolvedStoreId <= 0 || (!normalizedMolicar && !normalizedPlate) || !carValue) return;

    const timeoutId = window.setTimeout(() => {
      ensureVwfsYieldContainer();
      void loadVwfsScript(vwfsScriptSrc);
    }, VWFS_PRELOAD_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [resolvedStoreId, vehicle, vwfsClientKey, vwfsClientToken, vwfsScriptSrc]);

  const technicalRows = useMemo(
    () =>
      vehicle
        ? [
            ["Modelo", vehicle.name],
            ["Ano/Modelo", vehicle.year],
            ["Quilometragem", vehicle.km],
            ["Combustível", vehicle.fuel],
            ["Câmbio", vehicle.transmission],
            ["Cor", vehicle.color],
            ["Cidade", `${vehicle.city} - ${vehicle.uf}`],
            ["Loja", storeTitle]
          ]
        : [],
    [vehicle, storeTitle]
  );

  const openFinanceFollowUp = () => {
    if (financeFollowUpOpenedRef.current) return;
    financeFollowUpOpenedRef.current = true;
    setIsFinanceFollowUpOpen(true);
  };

  const armVwfsCloseWatcher = (assumeOpened = false) => {
    if (vwfsCloseWatcherRef.current) {
      vwfsCloseWatcherRef.current();
    }
    vwfsCloseWatcherRef.current = watchVwfsSimulatorClose(() => {
      vwfsCloseWatcherRef.current = null;
      openFinanceFollowUp();
    }, { assumeOpened });
  };

  const submitBancoVolksLead = async (vwfsResult: unknown) => {
    if (!vehicle) return;

    const tracking = getLeadTrackingPayload({
      form: "banco-volks-single",
      subject: "Lead Banco Volks - Ver parcelas",
      unitName: storeTitle,
      vehicleId: vehicle.id,
      vehicle: vehicle.name,
      price: vehicle.price
    });
    const leadPayload = createBancoVolksLeadPayload(vwfsResult, {
      form: "banco-volks-single",
      subject: "Lead Banco Volks - Ver parcelas",
      unitName: storeTitle,
      vehicle: leadVehicleContext,
      message: `Veículo: ${vehicle.name}\nPreço: ${vehicle.price}\nPágina: ${leadVehicleContext.url}`,
      tracking,
      meta: {
        page_url: leadVehicleContext.url,
        store_id: resolvedStoreId,
        unit_technical_id: resolvedStoreId
      }
    });

    if (!leadPayload) return;

    try {
      logLeadPayload("banco-volks-single", leadPayload);
      const response = await fetch("/api/financiamento-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadPayload)
      });
      await logLeadmobResponse("banco-volks-single", response);
    } catch {
      // Best effort: the simulator flow must not be blocked by tracking failure.
    }
  };

  const handleVwfsFinish = (...result: unknown[]) => {
    void submitBancoVolksLead(result.length > 1 ? { result } : result[0]);
    clearVwfsLoadFallbackTimer();
    if (vwfsCloseWatcherRef.current) {
      vwfsCloseWatcherRef.current();
      vwfsCloseWatcherRef.current = null;
    }
    openFinanceFollowUp();
  };

  const clearVwfsLoadFallbackTimer = () => {
    if (!vwfsLoadFallbackTimerRef.current) return;
    clearTimeout(vwfsLoadFallbackTimerRef.current);
    vwfsLoadFallbackTimerRef.current = null;
  };

  const fallbackToFinanceFollowUp = (attemptId: number) => {
    if (vwfsOpenAttemptRef.current !== attemptId) return;
    vwfsOpenAttemptRef.current += 1;
    clearVwfsLoadFallbackTimer();
    if (vwfsCloseWatcherRef.current) {
      vwfsCloseWatcherRef.current();
      vwfsCloseWatcherRef.current = null;
    }
    setIsOpeningFinanceSimulator(false);
    openFinanceFollowUp();
  };

  const openFinanceSimulator = () => {
    if (!vehicle || isOpeningFinanceSimulator) return;

    const normalizedMolicar = normalizeMolicar(vehicle.molicar ?? "");
    const normalizedPlate = normalizePlateValue(vehicle.plate ?? "");
    const carValue = toVwfsMoney(vehicle.price);

    if (!vwfsClientKey || !vwfsClientToken || resolvedStoreId <= 0 || (!normalizedMolicar && !normalizedPlate)) {
      window.alert("Simulador oficial indisponível para este veículo no momento.");
      return;
    }

    if (!carValue) {
      window.alert("Preço inválido para simulação oficial.");
      return;
    }

    const { manufactureAt, modelYear } = parseVehicleYears(vehicle.year);
    const payload = {
      clientKey: vwfsClientKey,
      clientToken: vwfsClientToken,
      storeId: resolvedStoreId,
      carType: resolveCarType(`${vehicle.name} ${vehicle.subtitle}`),
      carValue,
      inputPercent: 40,
      deadline: 48,
      manufactureAt,
      modelYear,
      ...(normalizedMolicar ? { molicar: normalizedMolicar } : {}),
      ...(normalizedPlate ? { plate: normalizedPlate } : {}),
      status: "USED",
      brand: vehicle.brand || vehicle.name.split(" ")[0] || "VW",
      model: vehicle.model || vehicle.name,
      version: vehicle.version || vehicle.subtitle || "Sem versão",
      vehicleImagem: vehicle.image || FALLBACK_IMAGE
    } satisfies Record<string, unknown>;

    const attemptId = vwfsOpenAttemptRef.current + 1;
    vwfsOpenAttemptRef.current = attemptId;
    financeFollowUpOpenedRef.current = false;
    clearVwfsLoadFallbackTimer();
    setIsOpeningFinanceSimulator(true);
    ensureVwfsYieldContainer();
    vwfsLoadFallbackTimerRef.current = setTimeout(() => fallbackToFinanceFollowUp(attemptId), VWFS_LOAD_FALLBACK_MS);

    void loadVwfsScript(vwfsScriptSrc).then((ok) => {
      if (vwfsOpenAttemptRef.current !== attemptId) return;
      clearVwfsLoadFallbackTimer();
      setIsOpeningFinanceSimulator(false);
      if (!ok || !window.bvfs?.simulator) {
        fallbackToFinanceFollowUp(attemptId);
        return;
      }

      try {
        armVwfsCloseWatcher();
        window.bvfs.simulator(payload, handleVwfsFinish);
        vwfsLoadFallbackTimerRef.current = setTimeout(() => {
          if (hasVisibleVwfsSurface()) {
            vwfsLoadFallbackTimerRef.current = null;
            return;
          }
          fallbackToFinanceFollowUp(attemptId);
        }, VWFS_LOAD_FALLBACK_MS);
      } catch {
        fallbackToFinanceFollowUp(attemptId);
      }
    });
  };

  const optionals = useMemo(
    () => [
      "Ar-condicionado digital",
      "Direção elétrica",
      "Chave presencial",
      "Piloto automático",
      "Câmera de ré",
      "Sensor de estacionamento",
      "Multimídia com espelhamento",
      "Rodas de liga leve"
    ],
    []
  );

  const goToImage = (index: number) => {
    if (!galleryItems.length) return;
    const nextIndex = (index + galleryItems.length) % galleryItems.length;
    if (nextIndex === selectedIndex) return;
    setSlideDirection(nextIndex > selectedIndex ? 1 : -1);
    setSelectedIndex(nextIndex);
  };

  const goToPrevImage = () => {
    setSlideDirection(-1);
    setSelectedIndex((current) => (current - 1 + galleryItems.length) % galleryItems.length);
  };

  const goToNextImage = () => {
    setSlideDirection(1);
    setSelectedIndex((current) => (current + 1) % galleryItems.length);
  };

  const scrollThumbs = (direction: "left" | "right") => {
    const thumbs = thumbsRef.current;
    if (!thumbs) return;
    thumbs.scrollBy({ left: direction === "right" ? 260 : -260, behavior: "smooth" });
  };

  const whatsappHref = useMemo(() => {
    if (!vehicle) return "";
    const digits = normalizePhone(storePhone);
    const phone = digits.length >= 10 ? `55${digits}` : "551144351000";
    const leadmobCompanyId = resolveLeadmobCompanyId({
      unitName: storeTitle,
      vehicle: {
        brand: vehicle.brand,
        store: storeTitle,
        city: vehicle.city,
        uf: vehicle.uf
      }
    });
    const message = encodeURIComponent(`|${leadmobCompanyId}|2|carro_seminovo||Tenho interesse no veiculo ${vehicle.name}`);
    return `https://wa.me/${phone}?text=${message}`;
  }, [storePhone, storeTitle, vehicle]);

  const handleShare = async () => {
    if (!vehicle) return;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: vehicle.name,
          text: `Confira este veículo da SAVOL: ${vehicle.name}`,
          url: shareUrl
        });
        return;
      } catch {
        return;
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedAction(true);
      window.setTimeout(() => setCopiedAction(false), 1400);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const validateLeadForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!leadForm.name.trim()) nextErrors.name = "Informe seu nome";
    if (!leadForm.phone.trim() || normalizePhone(leadForm.phone).length < 10) nextErrors.phone = "Informe telefone válido";
    if (!leadForm.email.trim() || !/^\S+@\S+\.\S+$/.test(leadForm.email)) nextErrors.email = "Informe e-mail válido";
    if (!leadForm.consent) nextErrors.consent = "Autorize o contato para enviar";

    setLeadErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateLeadForm()) return;

    setIsLeadSubmitting(true);
    setLeadErrors({});
    try {
      const tracking = getLeadTrackingPayload({
        form: "proposta-veiculo",
        unitName: storeTitle,
        vehicleId: vehicle?.id,
        vehicle: vehicle?.name || "",
        price: vehicle?.price || ""
      });
      const leadPayload = {
        form: "proposta-veiculo",
        subject: "Proposta de veículo",
        name: leadForm.name,
        phone: leadForm.phone,
        email: leadForm.email,
        unitName: storeTitle,
        vehicle: leadVehicleContext,
        message: [
          `Interesse: ${leadForm.interest || vehicle?.name || ""}`,
          `Preço: ${vehicle?.price || ""}`,
          `Página: ${typeof window !== "undefined" ? window.location.href : ""}`,
          leadForm.message
        ].filter(Boolean).join("\n"),
        utm: tracking.utm,
        meta: {
          ...tracking.meta,
          page_url: leadVehicleContext.url,
          store_id: resolvedStoreId,
          unit_technical_id: resolvedStoreId
        }
      };
      logLeadPayload("proposta-veiculo", leadPayload);
      const response = await fetch("/api/leadmob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadPayload)
      });
      await logLeadmobResponse("proposta-veiculo", response);

      if (!response.ok) throw new Error("leadmob");
      setLeadSuccess(true);
    } catch {
      setLeadErrors((current) => ({ ...current, submit: "Não foi possível enviar agora. Tente novamente." }));
    } finally {
      setIsLeadSubmitting(false);
    }
  };

  if (loadingVehicle) {
    return (
      <section className="container vehicle-details vehicle-details--loading">
        <p>Carregando veículo...</p>
      </section>
    );
  }

  if (!vehicle) {
    return (
      <section className="container vehicle-details vehicle-details--not-found">
        <h1>Veículo não encontrado</h1>
        <p>Este item não está mais disponível ou foi removido do estoque.</p>
        <Link href="/veiculos" className="btn">
          Voltar para veículos
        </Link>
      </section>
    );
  }

  return (
    <section className="container vehicle-details">
      <nav className="vehicle-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/veiculos">Veículos</Link>
        <span>/</span>
        <span>{breadcrumbCategory}</span>
        <span>/</span>
        <span>{vehicle.brand}</span>
        <span>/</span>
        <span>{vehicle.model}</span>
        <span>/</span>
        <span className="vehicle-breadcrumb-current">{vehicle.subtitle}</span>
      </nav>

      <div className="vehicle-details-layout">
        <div className="vehicle-details-gallery-col">
          <article className="vehicle-media-card">
            {!isPreparationFallback && displayQualityTag ? (
              <span className={`vehicle-media-badge vehicle-media-badge--${resolveHighlightTone(displayQualityTag)}`}>{displayQualityTag}</span>
            ) : null}

            {!isPreparationFallback && (
              <>
                <button type="button" className="vehicle-media-arrow vehicle-media-arrow--left" aria-label="Foto anterior" onClick={goToPrevImage}>
                  <ChevronLeft size={20} />
                </button>
                <button type="button" className="vehicle-media-arrow vehicle-media-arrow--right" aria-label="Próxima foto" onClick={goToNextImage}>
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${activeImage}-${selectedIndex}`}
                className="vehicle-media-slide"
                custom={slideDirection}
                initial={{ opacity: 0, x: slideDirection > 0 ? 32 : -32, scale: 1.03, filter: "blur(5px)" }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: slideDirection > 0 ? -24 : 24, scale: 0.99, filter: "blur(4px)" }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  className={`vehicle-media-hit${isPreparationFallback ? " vehicle-media-hit--preparation" : ""}`}
                  onClick={() => {
                    if (!isPreparationFallback) setIsLightboxOpen(true);
                  }}
                  aria-label={isPreparationFallback ? "Imagem do veículo" : "Abrir imagem em tela cheia"}
                >
                  <Image src={activeImage} alt={vehicle.name} width={1280} height={860} />
                </button>
              </motion.div>
            </AnimatePresence>

            {!isPreparationFallback && (
              <div className="vehicle-media-footer">
                <button type="button" className="vehicle-media-view-btn" onClick={() => setIsLightboxOpen(true)}>
                  Ver fotos
                </button>
                <span className="vehicle-media-counter">
                  {selectedIndex + 1}/{galleryItems.length}
                </span>
              </div>
            )}
          </article>

          {!isPreparationFallback && (
            <div className="vehicle-thumb-shell">
              <button type="button" className="vehicle-thumb-nav vehicle-thumb-nav--left" aria-label="Miniaturas anteriores" onClick={() => scrollThumbs("left")}>
                <ChevronLeft size={17} />
              </button>

              <div className="vehicle-thumb-track" ref={thumbsRef}>
                {galleryItems.map((imageUrl, index) => (
                  <button type="button" key={`${imageUrl}-${index}`} className={`vehicle-thumb-item${selectedIndex === index ? " is-active" : ""}`} onClick={() => goToImage(index)}>
                    <Image src={imageUrl} alt={`${vehicle.name} - foto ${index + 1}`} width={150} height={98} />
                  </button>
                ))}
              </div>

              <button type="button" className="vehicle-thumb-nav vehicle-thumb-nav--right" aria-label="Próximas miniaturas" onClick={() => scrollThumbs("right")}>
                <ChevronRight size={17} />
              </button>
            </div>
          )}

          {!isPreparationFallback && loadingGallery && <p className="vehicle-details-gallery-status">Carregando galeria completa...</p>}
        </div>

        <aside className="vehicle-details-side">
          <article className="vehicle-info-card">
            <h1>{vehicle.name}</h1>
            {(vehicle.armored || vehicle.negotiating) ? (
              <div className="vehicle-status-badges">
                {vehicle.armored ? (
                  <span className="vehicle-armored-badge">
                    <ShieldCheck size={13} /> Blindado
                  </span>
                ) : null}
                {vehicle.negotiating ? (
                  <span className="vehicle-negotiating-badge">
                    <Tag size={13} /> Em negociação
                  </span>
                ) : null}
              </div>
            ) : null}
            <p className="vehicle-info-subtitle">{vehicle.subtitle}</p>
            <p className="vehicle-year-badge">Ano/Modelo {vehicle.year}</p>

            {vehicle.oldPrice ? <p className="vehicle-old-price">{vehicle.oldPrice}</p> : null}
            <p className="vehicle-price-line">
              Por <strong>{vehicle.price}</strong>
            </p>

            <div className="vehicle-store-block">
              <h3>
                <MapPin size={16} /> {storeTitle}
              </h3>
              <p>{storeAddress}</p>
            </div>

            <div className="vehicle-quick-actions">
              <button type="button" className="vehicle-quick-btn" onClick={handleShare}>
                <Share2 size={16} /> {copiedAction ? "Copiado" : "Compartilhar"}
              </button>
              <button type="button" className="vehicle-quick-btn" onClick={handlePrint}>
                <Printer size={16} /> Imprimir
              </button>
              <a href={whatsappHref} className="vehicle-quick-btn" target="_blank" rel="noreferrer">
                <Image
                  src="/images/whatsapp_icon.png"
                  alt=""
                  width={18}
                  height={18}
                  className="vehicle-whatsapp-logo"
                />
                WhatsApp
              </a>
              <button type="button" className="vehicle-quick-btn vehicle-quick-btn--finance" onClick={openFinanceSimulator} disabled={isOpeningFinanceSimulator}>
                {isOpeningFinanceSimulator ? <LoaderCircle size={16} className="spin" /> : <WalletCards size={16} />}
                {isOpeningFinanceSimulator ? "Preparando simulador..." : "Ver parcelas"}
              </button>
              <button type="button" className={`vehicle-quick-btn${isCurrentVehicleFavorite ? " is-favorite" : ""}`} onClick={() => vehicle && toggleFavorite(toSavedVehicle(vehicle))}>
                <Heart size={16} fill={isCurrentVehicleFavorite ? "currentColor" : "none"} /> {isCurrentVehicleFavorite ? "Favorito" : "Favoritar"}
              </button>
            </div>
          </article>

          <article className="vehicle-lead-card">
            <h2>Envie uma proposta</h2>
            <form className="vehicle-lead-form" onSubmit={handleLeadSubmit}>
              <div className="vehicle-lead-grid">
                <label className="vehicle-field">
                  <span>Nome completo</span>
                  <input
                    type="text"
                    value={leadForm.name}
                    onChange={(event) => {
                      setLeadForm((current) => ({ ...current, name: event.target.value }));
                      setLeadErrors((current) => ({ ...current, name: "" }));
                    }}
                  />
                  {leadErrors.name ? <small>{leadErrors.name}</small> : null}
                </label>

                <label className="vehicle-field">
                  <span>Interesse em</span>
                  <select value={leadForm.interest} onChange={(event) => setLeadForm((current) => ({ ...current, interest: event.target.value }))}>
                    <option value={vehicle.name}>{vehicle.name}</option>
                  </select>
                </label>

                <label className="vehicle-field">
                  <span>Telefone / WhatsApp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={leadForm.phone}
                    onChange={(event) => {
                      setLeadForm((current) => ({ ...current, phone: normalizePhone(event.target.value) }));
                      setLeadErrors((current) => ({ ...current, phone: "" }));
                    }}
                  />
                  {leadErrors.phone ? <small>{leadErrors.phone}</small> : null}
                </label>

                <label className="vehicle-field">
                  <span>E-mail</span>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(event) => {
                      setLeadForm((current) => ({ ...current, email: event.target.value }));
                      setLeadErrors((current) => ({ ...current, email: "" }));
                    }}
                  />
                  {leadErrors.email ? <small>{leadErrors.email}</small> : null}
                </label>

                <label className="vehicle-field vehicle-field--full">
                  <span>Mensagem (opcional)</span>
                  <textarea
                    rows={4}
                    placeholder="Conte-nos mais sobre o que procura..."
                    value={leadForm.message}
                    onChange={(event) => setLeadForm((current) => ({ ...current, message: event.target.value.slice(0, 500) }))}
                  />
                </label>
              </div>

              <label className="vehicle-consent">
                <input
                  type="checkbox"
                  checked={leadForm.consent}
                  onChange={(event) => {
                    setLeadForm((current) => ({ ...current, consent: event.target.checked }));
                    setLeadErrors((current) => ({ ...current, consent: "" }));
                  }}
                />
                <span>Autorizo o contato da SAVOL Seminovos por e-mail, telefone ou WhatsApp.</span>
              </label>
              {leadErrors.consent ? <p className="vehicle-consent-error">{leadErrors.consent}</p> : null}

              {leadErrors.submit ? <p className="vehicle-consent-error">{leadErrors.submit}</p> : null}

              <button type="submit" className="vehicle-lead-submit" disabled={isLeadSubmitting}>
                {isLeadSubmitting ? "Enviando..." : "Enviar proposta"}
              </button>

              {leadSuccess ? <p className="vehicle-lead-success">Proposta enviada! Retornaremos em breve.</p> : null}
            </form>
          </article>
        </aside>
      </div>

      <section className="vehicle-extra">
        <article className="vehicle-extra-top">
          <div className="vehicle-extra-main">
            <div className="vehicle-extra-tabs">
              <button type="button" className={detailsTab === "sobre" ? "is-active" : ""} onClick={() => setDetailsTab("sobre")}>
                Sobre o veículo
              </button>
              <button type="button" className={detailsTab === "opcionais" ? "is-active" : ""} onClick={() => setDetailsTab("opcionais")}>
                Opcionais
              </button>
              <button type="button" className={detailsTab === "ficha" ? "is-active" : ""} onClick={() => setDetailsTab("ficha")}>
                Ficha técnica
              </button>
              <button type="button" className={detailsTab === "financiamento" ? "is-active" : ""} onClick={() => setDetailsTab("financiamento")}>
                Financiamento
              </button>
              <button type="button" className={detailsTab === "loja" ? "is-active" : ""} onClick={() => setDetailsTab("loja")}>
                Loja
              </button>
            </div>

            {detailsTab === "sobre" && (
              <div className="vehicle-extra-panel">
                <h3>Sobre este veículo</h3>
                <div className="vehicle-tab-specs vehicle-tab-specs--five">
                  <span>
                    <CalendarDays size={16} /> {vehicle.year}
                  </span>
                  <span>
                    <GitBranch size={16} /> {vehicle.transmission}
                  </span>
                  <span>
                    <Fuel size={16} /> {vehicle.fuel}
                  </span>
                  <span>
                    <Gauge size={16} /> {vehicle.km}
                  </span>
                  {plateEndingDigit ? (
                    <span>
                      <Tag size={16} /> Final de placa: {plateEndingDigit}
                    </span>
                  ) : null}
                </div>
                <p>
                  {vehicle.name} {vehicle.subtitle}. Veículo com {vehicle.transmission.toLowerCase()} e {vehicle.fuel.toLowerCase()}, pronto para uso diário com conforto,
                  segurança e tecnologia.
                </p>
                <p className="vehicle-location-text">
                  Unidade: {storeTitle}. {isUnknownValue(storeAddress) ? "Endereço sob consulta." : storeAddress}
                </p>
                {Boolean(secondaryHighlights.length) && (
                  <div className="vehicle-extra-badges">
                    {secondaryHighlights.map((highlight, index) => {
                      const Icon = resolveHighlightIcon(highlight);
                      const tone = resolveHighlightTone(highlight);
                      return (
                        <span key={`${highlight}-${index}`} className={`vehicle-extra-badge--${tone}`}>
                          <Icon size={15} /> {highlight}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {detailsTab === "opcionais" && (
              <div className="vehicle-extra-panel">
                <h3>Opcionais e conforto</h3>
                <div className="vehicle-optionals-grid">
                  {optionals.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            )}

            {detailsTab === "ficha" && (
              <div className="vehicle-extra-panel">
                <h3>Ficha técnica resumida</h3>
                <div className="vehicle-tab-specs">
                  <span>
                    <CalendarDays size={16} /> {vehicle.year}
                  </span>
                  <span>
                    <GitBranch size={16} /> {vehicle.transmission}
                  </span>
                  <span>
                    <Fuel size={16} /> {vehicle.fuel}
                  </span>
                  <span>
                    <Gauge size={16} /> {vehicle.km}
                  </span>
                </div>
                <div className="vehicle-tech-list">
                  {technicalRows.map(([label, value]) => (
                    <div key={label}>
                      <strong>{label}</strong>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailsTab === "financiamento" && (
              <div className="vehicle-extra-panel">
                <h3>Simule seu financiamento</h3>
                <p>Condições de financiamento com aprovação rápida, entrada facilitada e parcelas ajustadas ao seu perfil.</p>
                <button type="button" className="vehicle-finance-btn" onClick={openFinanceSimulator} disabled={isOpeningFinanceSimulator}>
                  {isOpeningFinanceSimulator ? <LoaderCircle size={18} className="spin" /> : <WalletCards size={18} />}
                  {isOpeningFinanceSimulator ? "Preparando simulador..." : "Simular agora"}
                </button>
              </div>
            )}

            {detailsTab === "loja" && (
              <div className="vehicle-extra-panel">
                <h3>Informações da loja</h3>
                <p className="vehicle-location-text">{storeTitle}</p>
                <p className="vehicle-location-text">{storeAddress}</p>
                <p>{storePhone}</p>
                <button type="button" className="vehicle-map-link" onClick={() => setIsDirectionsOpen(true)}>
                  Ver rota no mapa
                </button>
              </div>
            )}
          </div>
        </article>

        <article className="vehicle-related">
          <header>
            <h3>Veículos similares que podem te interessar</h3>
          </header>
          <div className="vehicle-related-grid">
            {loadingRelated &&
              Array.from({ length: 3 }).map((_, index) => (
                <article className="vehicle-related-card is-loading" key={`related-skeleton-${index}`}>
                  <div />
                </article>
              ))}

            {!loadingRelated &&
              relatedVehicles.map((item) => (
                <VehicleOfferCard
                  key={item.id}
                  vehicleId={item.id}
                  name={item.name}
                  subtitle={item.subtitle}
                  image={item.image || FALLBACK_IMAGE}
                  gallery={item.gallery}
                  year={item.year}
                  transmission={item.transmission}
                  fuel={item.fuel}
                  km={item.km}
                  store={removeStorePrefix(item.store)}
                  storeId={item.storeId}
                  oldPrice={item.oldPrice}
                  price={item.price}
                  detailUrl={item.url}
                  adUrl={item.absoluteUrl}
                  qualityTag={item.qualityTag}
                  secondaryHighlights={item.secondaryHighlights}
                  armored={item.armored}
                  negotiating={item.negotiating}
                  showFinanceButton={false}
                />
              ))}
          </div>
        </article>
      </section>

      <AnimatePresence>
        {isLightboxOpen && !isPreparationFallback && (
          <motion.div className="vehicle-lightbox-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLightboxOpen(false)}>
            <motion.div
              className="vehicle-lightbox-dialog"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="vehicle-lightbox-close" onClick={() => setIsLightboxOpen(false)} aria-label="Fechar lightbox">
                <X size={20} />
              </button>
              <button type="button" className="vehicle-lightbox-nav vehicle-lightbox-nav--left" onClick={goToPrevImage} aria-label="Foto anterior">
                <ChevronLeft size={24} />
              </button>
              <div className="vehicle-lightbox-media">
                <Image src={activeImage} alt={vehicle.name} width={1440} height={920} />
              </div>
              <button type="button" className="vehicle-lightbox-nav vehicle-lightbox-nav--right" onClick={goToNextImage} aria-label="Próxima foto">
                <ChevronRight size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapDirectionsModal
        open={isDirectionsOpen}
        storeName={storeTitle}
        address={storeAddress}
        onClose={() => setIsDirectionsOpen(false)}
      />

      <FinanceFollowUpModal
        open={isFinanceFollowUpOpen}
        onClose={() => {
          financeFollowUpOpenedRef.current = false;
          setIsFinanceFollowUpOpen(false);
        }}
        context={{
          form: "financiamento-single",
          subject: "Financiamento",
          unitName: storeTitle,
          vehicle: leadVehicleContext,
          message: vehicle ? `Veículo: ${vehicle.name}\nPreço: ${vehicle.price}\nPágina: ${leadVehicleContext.url}` : "",
          meta: {
            page_url: leadVehicleContext.url,
            store_id: resolvedStoreId,
            unit_technical_id: resolvedStoreId
          }
        }}
      />
    </section>
  );
}
