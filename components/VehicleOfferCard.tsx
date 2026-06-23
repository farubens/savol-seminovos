"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Eye,
  Fuel,
  Gauge,
  GitBranch,
  Heart,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  WalletCards,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FinanceFollowUpModal } from "@/components/FinanceFollowUpModal";
import { MapDirectionsModal } from "@/components/MapDirectionsModal";
import { type SavedVehicle, useSavolAccount } from "@/components/SavolAccountProvider";
import { logLeadmobResponse, logLeadPayload } from "@/lib/leadDebug";
import { getLeadTrackingPayload } from "@/lib/leadTracking";
import { buildOldPriceLabelFromOfficialPrice } from "@/utils/pricing";
import { watchVwfsSimulatorClose } from "@/utils/vwfsModalWatcher";

type Props = {
  vehicleId: number;
  name: string;
  subtitle: string;
  image: string;
  gallery?: string[];
  year: string;
  transmission: string;
  fuel: string;
  km: string;
  store: string;
  oldPrice?: string;
  price: string;
  detailUrl?: string;
  qualityTag?: string;
  secondaryHighlights?: string[];
  delay?: number;
  variant?: "grid" | "list";
  molicar?: string;
  plate?: string;
};

declare global {
  interface Window {
    bvfs?: {
      simulator: (payload: Record<string, unknown>, onFinish?: () => void) => void;
    };
  }
}

function normalizeTag(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function resolveTagTone(value: string): "repasse" | "garantia" | "unico-dono" | "default" {
  const normalized = normalizeTag(value);
  if (normalized.includes("repasse")) return "repasse";
  if (normalized.includes("garantia")) return "garantia";
  if (normalized.includes("unico dono")) return "unico-dono";
  return "default";
}

function shouldShowCardHighlight(value: string): boolean {
  const normalized = normalizeTag(value);
  if (!normalized) return false;
  if (normalized.includes("seminovo")) return false;
  if (normalized.includes("abaixo") && normalized.includes("fipe")) return false;
  return true;
}

function resolveHighlightTone(value: string): "repasse" | "garantia" | "unico-dono" | "baixa-km" | "fipe" | "impecavel" | "completo" | "default" {
  const normalized = normalizeTag(value);
  if (normalized.includes("repasse")) return "repasse";
  if (normalized.includes("garantia")) return "garantia";
  if (normalized.includes("unico dono")) return "unico-dono";
  if (normalized.includes("baixa km")) return "baixa-km";
  if (normalized.includes("abaixo") && normalized.includes("fipe")) return "fipe";
  if (normalized.includes("impecavel")) return "impecavel";
  if (normalized.includes("completo")) return "completo";
  return "default";
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
  if (!value) return null;
  let cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;

  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/\./g, "");
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function formatMoney(value: number, minimumFractionDigits = 0, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
}

function resolveOldPrice(oldPrice: string | undefined, price: string): string {
  const calculated = buildOldPriceLabelFromOfficialPrice(price);
  if (calculated) return calculated;
  if (oldPrice && oldPrice.trim()) return oldPrice;
  return "";
}

function formatEntryInput(value: number): string {
  return formatMoney(Math.max(0, value), 0, 0);
}

function parseEntryInput(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return 0;
  return Number(digits);
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, "").slice(0, 11);
}

function calculateCompoundInstallment(principal: number, monthlyRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return principal / months;
  const factor = (1 + monthlyRate) ** months;
  return principal * ((monthlyRate * factor) / (factor - 1));
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function toAbsoluteDetailUrl(url: string): string {
  if (!url || url === "#") return typeof window !== "undefined" ? window.location.href : "";
  if (isExternalUrl(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

function shouldIgnoreCardNavigation(target: EventTarget | null): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  return Boolean(target.closest("a, button, input, select, textarea, label, [role='button']"));
}

function normalizeStoreName(value: string): string {
  return value.replace(/^loja:\s*/i, "").trim();
}

function resolveSlugFromDetailUrl(url: string): string {
  const cleanUrl = url.split("?")[0].replace(/\/+$/, "");
  const chunks = cleanUrl.split("/").filter(Boolean);
  return chunks.at(-1) ?? "";
}

let vwfsScriptPromise: Promise<boolean> | null = null;

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

function parseVehicleYears(value: string): { manufactureAt: number; modelYear: number } {
  const matches = value.match(/(19|20)\d{2}/g) ?? [];
  const manufactureAt = Number(matches[0]) || new Date().getFullYear();
  const modelYear = Number(matches[1]) || manufactureAt;
  return { manufactureAt, modelYear };
}

function resolveCarType(text: string): "AUTOMOVEIS" | "UTILITARIOS" {
  const normalized = text.toLowerCase();
  if (/\b(van|furgao|furgão|utilitario|utilitário|pickup|picape)\b/.test(normalized)) {
    return "UTILITARIOS";
  }
  return "AUTOMOVEIS";
}

function normalizeMolicar(value: string): string {
  return value.replace(/[^0-9-]/g, "").trim();
}

function normalizePlateValue(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function toVwfsMoney(value: string): string {
  const numeric = parseMoney(value);
  if (!numeric || numeric <= 0) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numeric);
}

function canUseVwfsOnCurrentHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  const allowedHosts = [
    "savol-seminovos-clean.vercel.app",
    "savol-seminovos-clean-14i3gz0b0-farubens-projects.vercel.app",
    "savol-seminovos-clean-gchvlqomd-farubens-projects.vercel.app"
  ];
  if (allowedHosts.includes(host)) return true;
  return host.endsWith(".vercel.app") && host.includes("savol-seminovos-clean");
}

const galleryCacheByVehicle = new Map<number, string[]>();
const galleryInFlightByVehicle = new Map<number, Promise<string[]>>();
const FALLBACK_IMAGE = "/images/em-preparacao.jpg";
const PREPARATION_IMAGE_TOKEN = "/images/em-preparacao";
const VWFS_UAT_SCRIPT = "https://uat.vwfsbrasil.com.br/seller/partners/simulator.js";
const VWFS_UAT_CLIENT_KEY = "M7alq91A0YbgWoXjZDQqx5NrJK83dB5RwGnmp4xP";
const VWFS_UAT_CLIENT_TOKEN = "dcfc4f7a26fc8e704465e0e7892011d3cca98aad2eb21c18b47c4901a0eed82b";
const VWFS_DEFAULT_STORE_ID = 123454;

function isPreparationImage(src: string): boolean {
  return src.toLowerCase().includes(PREPARATION_IMAGE_TOKEN);
}

async function loadVehicleGallery(vehicleId: number): Promise<string[]> {
  if (galleryCacheByVehicle.has(vehicleId)) {
    return galleryCacheByVehicle.get(vehicleId) ?? [];
  }

  if (!galleryInFlightByVehicle.has(vehicleId)) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const request = fetch(`/api/veiculos/${vehicleId}/galeria`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then((response) => (response.ok ? response.json() : { gallery: [] }))
      .then((payload: { gallery?: string[] }) => {
        const items = Array.isArray(payload.gallery) ? payload.gallery.filter(Boolean) : [];
        galleryCacheByVehicle.set(vehicleId, items);
        return items;
      })
      .catch(() => [])
      .finally(() => {
        clearTimeout(timeoutId);
        galleryInFlightByVehicle.delete(vehicleId);
      });

    galleryInFlightByVehicle.set(vehicleId, request);
  }

  return (await galleryInFlightByVehicle.get(vehicleId)) ?? [];
}

export function VehicleOfferCard({
  vehicleId,
  name,
  subtitle,
  image,
  gallery = [],
  year,
  transmission,
  fuel,
  km,
  store,
  oldPrice = "",
  price,
  detailUrl = "#",
  qualityTag = "",
  secondaryHighlights = [],
  delay = 0,
  variant = "grid",
  molicar = "",
  plate = ""
}: Props) {
  type ProposalFormState = {
    name: string;
    phone: string;
    email: string;
    message: string;
    consent: boolean;
  };

  const router = useRouter();
  const { hasVisited, isFavorite, toggleFavorite } = useSavolAccount();
  const financeId = useId();
  const safeImage = image || FALLBACK_IMAGE;
  const isPreparationFallback = isPreparationImage(safeImage);
  const calculationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const galleryLoadingGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vwfsCloseWatcherRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const resolvedSecondaryHighlights = useMemo(
    () => {
      const seen = new Set<string>();
      return [qualityTag, ...secondaryHighlights]
        .map((highlight) => highlight.trim())
        .filter(shouldShowCardHighlight)
        .filter((highlight) => {
          const key = normalizeTag(highlight);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 4);
    },
    [qualityTag, secondaryHighlights]
  );
  const resolvedOldPrice = resolveOldPrice(oldPrice, price);
  const priceValue = parseMoney(price) ?? 0;
  const minEntryValue = useMemo(() => Math.round(priceValue * 0.4), [priceValue]);
  const monthlyInterestRate = 0.0165;
  const vwfsClientKey = process.env.NEXT_PUBLIC_VWFS_CLIENT_KEY?.trim() || VWFS_UAT_CLIENT_KEY;
  const vwfsClientToken = process.env.NEXT_PUBLIC_VWFS_CLIENT_TOKEN?.trim() || VWFS_UAT_CLIENT_TOKEN;
  const vwfsStoreId = Number(process.env.NEXT_PUBLIC_VWFS_STORE_ID ?? String(VWFS_DEFAULT_STORE_ID));
  const vwfsScriptSrc = process.env.NEXT_PUBLIC_VWFS_SCRIPT_SRC?.trim() || VWFS_UAT_SCRIPT;
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [isFinanceFollowUpOpen, setIsFinanceFollowUpOpen] = useState(false);
  const [isSimulatingFinance, setIsSimulatingFinance] = useState(false);
  const [didSimulateFinance, setDidSimulateFinance] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalSent, setProposalSent] = useState(false);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [isLoadingRemoteGallery, setIsLoadingRemoteGallery] = useState(false);
  const [remoteGallery, setRemoteGallery] = useState<string[]>([]);
  const [entryInput, setEntryInput] = useState(formatEntryInput(minEntryValue));
  const [entryError, setEntryError] = useState("");
  const [installments, setInstallments] = useState(48);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);
  const [proposalForm, setProposalForm] = useState<ProposalFormState>({
    name: "",
    phone: "",
    email: "",
    message: "",
    consent: true
  });
  const installmentOptions = [12, 24, 36, 48, 60, 72];
  const hasVwfsConfig = Boolean(vwfsClientKey && vwfsClientToken && vwfsStoreId > 0);
  const hasVehicleIdForVwfs = Boolean(normalizeMolicar(molicar) || normalizePlateValue(plate));
  const modalTitle = useMemo(() => {
    const normalizedName = normalizeSpaces(name);
    const normalizedSubtitle = normalizeSpaces(subtitle);

    if (normalizedSubtitle && normalizedName.toLowerCase().endsWith(normalizedSubtitle.toLowerCase())) {
      const shortName = normalizeSpaces(normalizedName.slice(0, normalizedName.length - normalizedSubtitle.length));
      if (shortName) return shortName;
    }

    const chunks = normalizedName.split(" ");
    if (chunks.length >= 2) {
      return `${chunks[0]} ${chunks[1]}`.trim();
    }

    return normalizedName;
  }, [name, subtitle]);
  const fallbackModalGallery = useMemo(() => {
    const sourceGallery = isPreparationFallback ? [] : gallery;
    const items = Array.from(new Set([safeImage, ...sourceGallery].filter(Boolean)));
    return items.length ? items : [FALLBACK_IMAGE];
  }, [gallery, isPreparationFallback, safeImage]);
  const modalGallery = useMemo(() => {
    const combined = Array.from(new Set([...remoteGallery, ...fallbackModalGallery].filter(Boolean)));
    return combined.length ? combined : [FALLBACK_IMAGE];
  }, [fallbackModalGallery, remoteGallery]);

  const entryValue = Math.min(parseEntryInput(entryInput), priceValue);
  const hasMinEntryError = priceValue > 0 && entryValue < minEntryValue;
  const financedValue = Math.max(priceValue - entryValue, 0);
  const installmentValue = calculateCompoundInstallment(financedValue, monthlyInterestRate, installments);

  useEffect(() => {
    setEntryInput(formatEntryInput(minEntryValue));
  }, [minEntryValue]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (calculationTimerRef.current) {
        clearTimeout(calculationTimerRef.current);
      }
      if (galleryLoadingGuardRef.current) {
        clearTimeout(galleryLoadingGuardRef.current);
      }
      if (vwfsCloseWatcherRef.current) {
        vwfsCloseWatcherRef.current();
        vwfsCloseWatcherRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isFinanceModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFinanceModalOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFinanceModalOpen]);

  const loadGalleryOnDemand = () => {
    if (isPreparationFallback) return;
    if (vehicleId <= 0) return;

    if (galleryCacheByVehicle.has(vehicleId)) {
      const cachedItems = galleryCacheByVehicle.get(vehicleId) ?? [];
      if (isMountedRef.current) {
        setRemoteGallery(cachedItems);
      }
      return;
    }

    setIsLoadingRemoteGallery(true);
    if (galleryLoadingGuardRef.current) {
      clearTimeout(galleryLoadingGuardRef.current);
    }
    galleryLoadingGuardRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsLoadingRemoteGallery(false);
    }, 4500);

    void loadVehicleGallery(vehicleId)
      .then((items) => {
        if (!isMountedRef.current) return;
        setRemoteGallery(items);
      })
      .finally(() => {
        if (galleryLoadingGuardRef.current) {
          clearTimeout(galleryLoadingGuardRef.current);
          galleryLoadingGuardRef.current = null;
        }
        if (!isMountedRef.current) return;
        setIsLoadingRemoteGallery(false);
      });
  };

  const openFinanceModal = () => {
    setInstallments(48);
    setEntryInput(formatEntryInput(minEntryValue));
    setEntryError("");
    setDidSimulateFinance(false);
    setShowProposalForm(false);
    setProposalSent(false);
    setIsSimulatingFinance(false);
    setIsLoadingRemoteGallery(false);
    setSelectedImageIndex(0);
    setRemoteGallery(galleryCacheByVehicle.get(vehicleId) ?? []);
    setIsFinanceModalOpen(true);
    loadGalleryOnDemand();
  };

  const buildVwfsPayload = (deadline = 48) => {
    const { manufactureAt, modelYear } = parseVehicleYears(year);
    const [brandToken = "", modelToken = ""] = name.split(" ");
    const versionToken = subtitle || name.replace(`${brandToken} ${modelToken}`.trim(), "").trim();
    const normalizedMolicar = normalizeMolicar(molicar);
    const normalizedPlate = normalizePlateValue(plate);
    const carValue = toVwfsMoney(price);

    if (!carValue) return null;

    return {
      clientKey: vwfsClientKey,
      clientToken: vwfsClientToken,
      storeId: vwfsStoreId,
      carType: resolveCarType(`${name} ${subtitle}`),
      carValue,
      inputPercent: 40,
      deadline,
      manufactureAt,
      modelYear,
      ...(normalizedMolicar ? { molicar: normalizedMolicar } : {}),
      ...(normalizedPlate ? { plate: normalizedPlate } : {}),
      status: "USED",
      brand: brandToken || "VW",
      model: modelToken || name,
      version: versionToken || subtitle || "Sem versão",
      vehicleImagem: safeImage
    } satisfies Record<string, unknown>;
  };

  const openFinanceFollowUp = () => {
    if (!isMountedRef.current) return;
    setIsFinanceModalOpen(false);
    setShowProposalForm(false);
    setProposalSent(false);
    setIsFinanceFollowUpOpen(true);
  };

  const armVwfsCloseWatcher = () => {
    if (vwfsCloseWatcherRef.current) {
      vwfsCloseWatcherRef.current();
    }
    vwfsCloseWatcherRef.current = watchVwfsSimulatorClose(() => {
      vwfsCloseWatcherRef.current = null;
      openFinanceFollowUp();
    });
  };

  const openVwfsSimulator = () => {
    if (isSimulatingFinance) return;
    if (!hasVwfsConfig || !hasVehicleIdForVwfs) {
      window.alert("Simulador oficial indisponível para este veículo no momento.");
      return;
    }

    const payload = buildVwfsPayload(48);
    if (!payload) {
      window.alert("Preço inválido para simulação oficial.");
      return;
    }

    setIsSimulatingFinance(true);
    ensureVwfsYieldContainer();
    void loadVwfsScript(vwfsScriptSrc).then((ok) => {
      setIsSimulatingFinance(false);
      if (!ok || !window.bvfs?.simulator) {
        if (vwfsCloseWatcherRef.current) {
          vwfsCloseWatcherRef.current();
          vwfsCloseWatcherRef.current = null;
        }
        window.alert("Simulador oficial indisponível no momento. Tente novamente em instantes.");
        return;
      }
      try {
        armVwfsCloseWatcher();
        window.bvfs.simulator(payload);
      } catch {
        if (vwfsCloseWatcherRef.current) {
          vwfsCloseWatcherRef.current();
          vwfsCloseWatcherRef.current = null;
        }
        window.alert("Falha ao abrir o simulador oficial. Tente novamente em instantes.");
      }
    });
  };

  const closeFinanceModal = () => {
    if (calculationTimerRef.current) {
      clearTimeout(calculationTimerRef.current);
      calculationTimerRef.current = null;
    }
    if (galleryLoadingGuardRef.current) {
      clearTimeout(galleryLoadingGuardRef.current);
      galleryLoadingGuardRef.current = null;
    }
    setIsSimulatingFinance(false);
    setIsLoadingRemoteGallery(false);
    setShowProposalForm(false);
    setProposalSent(false);
    setIsFinanceModalOpen(false);
  };

  const handleSimulateFinance = () => {
    if (showProposalForm) {
      setShowProposalForm(false);
      setProposalSent(false);
      return;
    }
    if (isSimulatingFinance || priceValue <= 0) return;
    const runLocalSimulation = () => {
      if (didSimulateFinance) {
        setShowProposalForm(true);
        return;
      }
      if (hasMinEntryError) {
        setEntryError("Necessário ser pelo menos 40% de entrada.");
        return;
      }
      setDidSimulateFinance(false);
      setIsSimulatingFinance(true);

      if (calculationTimerRef.current) {
        clearTimeout(calculationTimerRef.current);
      }

      calculationTimerRef.current = setTimeout(() => {
        setIsSimulatingFinance(false);
        setDidSimulateFinance(true);
      }, 3000);
    };

    if (hasVwfsConfig && hasVehicleIdForVwfs && canUseVwfsOnCurrentHost()) {
      const payload = buildVwfsPayload(installments);
      if (!payload) {
        setEntryError("Preço inválido para simulação oficial. Usando simulador local.");
        runLocalSimulation();
      } else {
      setIsSimulatingFinance(true);
      ensureVwfsYieldContainer();
      void loadVwfsScript(vwfsScriptSrc).then((ok) => {
        setIsSimulatingFinance(false);
        if (!ok || !window.bvfs?.simulator) {
          if (vwfsCloseWatcherRef.current) {
            vwfsCloseWatcherRef.current();
            vwfsCloseWatcherRef.current = null;
          }
          setEntryError("Simulador oficial indisponível no momento. Usando simulador local.");
          runLocalSimulation();
          return;
        }
        try {
          armVwfsCloseWatcher();
          window.bvfs.simulator(payload);
        } catch {
          if (vwfsCloseWatcherRef.current) {
            vwfsCloseWatcherRef.current();
            vwfsCloseWatcherRef.current = null;
          }
          setEntryError("Falha no simulador oficial. Usando simulador local.");
          runLocalSimulation();
        }
      });
      return;
      }
    }
    runLocalSimulation();
  };

  const handleEntryChange = (value: string) => {
    const numeric = parseEntryInput(value);
    setEntryInput(formatEntryInput(numeric));
    if (priceValue > 0 && numeric < minEntryValue) {
      setEntryError("Necessário ser pelo menos 40% de entrada.");
    } else {
      setEntryError("");
    }
    setDidSimulateFinance(false);
  };

  const handleInstallmentsChange = (value: number) => {
    setInstallments(value);
    setDidSimulateFinance(false);
  };

  const leadVehicleContext = useMemo(
    () => {
      const years = parseVehicleYears(year);
      const [brandToken = ""] = normalizeSpaces(name).split(" ");
      return {
        id: vehicleId,
        plate,
        brand: brandToken,
        model: name,
        version: subtitle,
        subtitle,
        year: years.modelYear,
        manufactureYear: years.manufactureAt,
        km,
        fuel,
        transmission,
        price,
        oldPrice: resolvedOldPrice,
        store,
        url: toAbsoluteDetailUrl(detailUrl),
        molicar
      };
    },
    [detailUrl, fuel, km, molicar, name, plate, price, resolvedOldPrice, store, subtitle, transmission, vehicleId, year]
  );

  const handleProposalSubmit = async () => {
    if (!proposalForm.name.trim()) return;
    if (normalizePhone(proposalForm.phone).length < 10) return;
    if (!proposalForm.email.trim()) return;
    if (!proposalForm.consent) return;
    setProposalSubmitting(true);
    try {
      const tracking = getLeadTrackingPayload({
        form: "proposta-financiamento-card",
        unitName: store,
        vehicleId,
        vehicle: name,
        price
      });
      const leadPayload = {
        form: "proposta-financiamento-card",
        subject: "Proposta de financiamento",
        name: proposalForm.name,
        phone: proposalForm.phone,
        email: proposalForm.email,
        unitName: store,
        vehicle: leadVehicleContext,
        message: [
          `Veículo: ${name}`,
          `Preço: ${price}`,
          `Entrada: ${entryInput}`,
          `Parcelas: ${installments}x`,
          proposalForm.message
        ].filter(Boolean).join("\n"),
        utm: tracking.utm,
        meta: tracking.meta
      };
      logLeadPayload("proposta-financiamento-card", leadPayload);
      const response = await fetch("/api/financiamento-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadPayload)
      });
      await logLeadmobResponse("proposta-financiamento-card", response);
      if (!response.ok) throw new Error("leadmob");
      setProposalSent(true);
    } catch {
      setProposalSent(false);
    } finally {
      setProposalSubmitting(false);
    }
  };

  const resultLabel = showProposalForm
    ? "Voltar"
    : didSimulateFinance
      ? `Parcelas de ${formatMoney(installmentValue, 2, 2)} - Saiba mais`
      : "Simular parcelas";
  const resolvedDetailUrl = detailUrl && detailUrl !== "#" ? detailUrl : "/veiculos";
  const detailUrlIsExternal = isExternalUrl(resolvedDetailUrl);
  const directionsStoreName = normalizeStoreName(store);
  const savedVehicle = useMemo<SavedVehicle>(
    () => ({
      id: vehicleId,
      slug: resolveSlugFromDetailUrl(resolvedDetailUrl),
      url: resolvedDetailUrl,
      name,
      subtitle,
      image: safeImage,
      gallery,
      year,
      transmission,
      fuel,
      km,
      store,
      oldPrice,
      price,
      qualityTag,
      secondaryHighlights,
      molicar,
      plate
    }),
    [fuel, gallery, km, molicar, name, oldPrice, plate, price, qualityTag, resolvedDetailUrl, safeImage, secondaryHighlights, store, subtitle, transmission, vehicleId, year]
  );
  const isSavedAsFavorite = isFavorite(vehicleId);
  const wasVisited = hasVisited(vehicleId);

  const navigateToDetails = () => {
    if (detailUrlIsExternal) {
      window.open(resolvedDetailUrl, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(resolvedDetailUrl);
  };

  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (shouldIgnoreCardNavigation(event.target)) return;
    navigateToDetails();
  };

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || shouldIgnoreCardNavigation(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    navigateToDetails();
  };

  const goToNextGalleryImage = () => {
    setSelectedImageIndex((current) => (current + 1) % modalGallery.length);
  };

  const goToPreviousGalleryImage = () => {
    setSelectedImageIndex((current) => (current - 1 + modalGallery.length) % modalGallery.length);
  };

  return (
    <>
      <motion.article
        className={`offer-card offer-card--${variant}`}
        role="link"
        tabIndex={0}
        aria-label={`Ver detalhes de ${modalTitle || name}`}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, delay, ease: "easeOut" }}
      >
        <div className={`offer-media${isPreparationFallback ? " offer-media--preparation" : ""}`}>
          <div className={`offer-card-actions-floating${wasVisited ? "" : " is-favorite-only"}`}>
            {wasVisited ? (
              <span className="offer-visited-icon" title="Você já visitou este veículo" aria-label="Veículo já visitado">
                <Eye size={17} />
              </span>
            ) : null}
            <button
              type="button"
              className={`offer-favorite-btn${isSavedAsFavorite ? " is-active" : ""}`}
              aria-label={isSavedAsFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              aria-pressed={isSavedAsFavorite}
              onClick={() => toggleFavorite(savedVehicle)}
            >
              <Heart size={18} fill={isSavedAsFavorite ? "currentColor" : "none"} />
            </button>
          </div>
          <Image src={safeImage} alt={name} width={630} height={360} />
        </div>

        <div className="offer-content">
          <div className="offer-body">
            <h3>{name}</h3>
            <p className="offer-subtitle">{subtitle}</p>

            <div className="offer-specs">
              <span className="offer-spec-item">
                <CalendarDays size={16} /> {year}
              </span>
              <span className="offer-spec-item">
                <GitBranch size={16} /> {transmission}
              </span>
              <span className="offer-spec-item">
                <Fuel size={16} /> {fuel}
              </span>
              <span className="offer-spec-item">
                <Gauge size={16} /> {km}
              </span>
            </div>

            <div className="offer-mobile-commerce">
              {Boolean(resolvedOldPrice) && <p className="offer-mobile-old-price">{resolvedOldPrice}</p>}
              <p className="offer-mobile-price">
                Por <strong>{price}</strong>
              </p>
              <p className="offer-mobile-store">
                <MapPin size={13} />
                <span>Loja: {store}</span>
              </p>
            </div>

            {Boolean(resolvedSecondaryHighlights.length) && (
              <div className="offer-highlights">
                {resolvedSecondaryHighlights.map((highlight, index) => {
                  const tone = resolveHighlightTone(highlight);
                  const HighlightIcon = resolveHighlightIcon(highlight);
                  return (
                    <span key={`${highlight}-${index}`} className={`offer-highlight offer-highlight--${tone}`}>
                      <HighlightIcon size={18} /> {highlight}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="offer-footer">
            {Boolean(resolvedOldPrice) && <p className="offer-old-price">{resolvedOldPrice}</p>}
            <p className="offer-price">
              Por <strong>{price}</strong>
            </p>

            <div className="offer-store-wrap">
              <p className="offer-store">
                <MapPin size={16} />
                <span className="offer-store-name">Loja: {store}</span>
              </p>
              <button type="button" className="offer-store-link" onClick={() => setIsDirectionsOpen(true)}>
                Como chegar
              </button>
            </div>

            <div className="offer-actions">
              <button type="button" className="offer-primary" onClick={openVwfsSimulator} disabled={isSimulatingFinance}>
                {isSimulatingFinance ? <LoaderCircle size={20} className="spin" /> : <WalletCards size={20} />}
                {isSimulatingFinance ? "Abrindo simulador..." : "Ver parcelas"}
              </button>
              {detailUrlIsExternal ? (
                <a className="offer-secondary" href={resolvedDetailUrl} target="_blank" rel="noopener noreferrer">
                  Saiba mais
                </a>
              ) : (
                <Link className="offer-secondary" href={resolvedDetailUrl}>
                  Saiba mais
                </Link>
              )}
            </div>
          </div>
        </div>
      </motion.article>

      <MapDirectionsModal
        open={isDirectionsOpen}
        storeName={directionsStoreName}
        address=""
        onClose={() => setIsDirectionsOpen(false)}
      />

      <AnimatePresence>
        {isFinanceModalOpen && (
          <motion.div
            className="finance-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeFinanceModal}
          >
            <motion.div
              className="finance-modal"
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="finance-modal-close" onClick={closeFinanceModal} aria-label="Fechar modal">
                <X size={20} />
              </button>

              <div className="finance-modal-grid">
                <div className="finance-modal-gallery">
                  <div className={`finance-modal-media${isPreparationFallback ? " finance-modal-media--preparation" : ""}`}>
                    <Image src={modalGallery[selectedImageIndex] ?? safeImage} alt={name} width={920} height={620} />
                    {!isPreparationFallback && modalGallery.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="finance-modal-gallery-nav finance-modal-gallery-nav--prev"
                          aria-label="Imagem anterior"
                          onClick={goToPreviousGalleryImage}
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          type="button"
                          className="finance-modal-gallery-nav finance-modal-gallery-nav--next"
                          aria-label="Próxima imagem"
                          onClick={goToNextGalleryImage}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </>
                    )}
                  </div>

                  {!isPreparationFallback && (
                    <div className="finance-modal-gallery-strip">
                      {modalGallery.map((galleryImage, index) => (
                        <button
                          type="button"
                          key={`${galleryImage}-${index}`}
                          className={`finance-modal-thumb${index === selectedImageIndex ? " is-active" : ""}`}
                          onClick={() => setSelectedImageIndex(index)}
                          aria-label={`Visualizar imagem ${index + 1}`}
                        >
                          <Image src={galleryImage} alt={`${name} - miniatura ${index + 1}`} width={150} height={92} />
                        </button>
                      ))}
                    </div>
                  )}
                  {!isPreparationFallback && isLoadingRemoteGallery && (
                    <p className="finance-modal-gallery-loading">
                      <LoaderCircle size={14} className="spin" /> Carregando galeria completa...
                    </p>
                  )}
                </div>

                <div className="finance-modal-content">
                  <div className="finance-modal-head">
                    <div>
                      <h3>{modalTitle}</h3>
                      <p>{subtitle}</p>
                    </div>
                  </div>

                  <div className="finance-modal-specs">
                    <span className="offer-spec-item">
                      <CalendarDays size={16} /> {year}
                    </span>
                    <span className="offer-spec-item">
                      <GitBranch size={16} /> {transmission}
                    </span>
                    <span className="offer-spec-item">
                      <Fuel size={16} /> {fuel}
                    </span>
                    <span className="offer-spec-item">
                      <Gauge size={16} /> {km}
                    </span>
                  </div>

                  <p className="finance-modal-description">
                    Veículo revisado, com ótima procedência e pronto para o dia a dia. Simule seu financiamento direto no modal.
                  </p>

                  <div className="finance-modal-divider" />

                  <div className={`finance-modal-bottom${showProposalForm ? " is-proposal-mode" : ""}`}>
                    {!showProposalForm && (
                      <div className="finance-modal-price">
                        {Boolean(resolvedOldPrice) && <p className="finance-modal-old-price">{resolvedOldPrice}</p>}
                        <p className="finance-modal-current-price">
                          Por <strong>{price}</strong>
                        </p>
                        <p className="finance-modal-store">
                          <MapPin size={16} /> Loja: {store}
                        </p>
                      </div>
                    )}

                    {showProposalForm ? (
                      <div className="finance-modal-form finance-modal-form--proposal">
                        <div className="finance-modal-proposal-meta">
                          {Boolean(resolvedOldPrice) && <p className="finance-modal-old-price">{resolvedOldPrice}</p>}
                          <p className="finance-modal-current-price">
                            Por <strong>{price}</strong>
                          </p>
                          <p className="finance-modal-store">
                            <MapPin size={16} /> Loja: {store}
                          </p>
                        </div>

                        <h4>Envie uma proposta</h4>
                        <label htmlFor={`proposal-name-${financeId}`}>Nome completo</label>
                        <input
                          id={`proposal-name-${financeId}`}
                          type="text"
                          value={proposalForm.name}
                          onChange={(event) => setProposalForm((current) => ({ ...current, name: event.target.value }))}
                        />

                        <label htmlFor={`proposal-phone-${financeId}`}>Telefone / WhatsApp</label>
                        <input
                          id={`proposal-phone-${financeId}`}
                          type="text"
                          inputMode="numeric"
                          value={proposalForm.phone}
                          onChange={(event) => setProposalForm((current) => ({ ...current, phone: normalizePhone(event.target.value) }))}
                        />

                        <label htmlFor={`proposal-email-${financeId}`}>E-mail</label>
                        <input
                          id={`proposal-email-${financeId}`}
                          type="email"
                          value={proposalForm.email}
                          onChange={(event) => setProposalForm((current) => ({ ...current, email: event.target.value }))}
                        />

                        <label htmlFor={`proposal-msg-${financeId}`}>Mensagem (opcional)</label>
                        <textarea
                          id={`proposal-msg-${financeId}`}
                          rows={3}
                          placeholder="Conte-nos mais sobre o que procura..."
                          value={proposalForm.message}
                          onChange={(event) => setProposalForm((current) => ({ ...current, message: event.target.value.slice(0, 500) }))}
                        />

                        <label className="finance-modal-consent">
                          <input
                            type="checkbox"
                            checked={proposalForm.consent}
                            onChange={(event) => setProposalForm((current) => ({ ...current, consent: event.target.checked }))}
                          />
                          <span>Autorizo o contato da Savol por e-mail, telefone ou WhatsApp.</span>
                        </label>

                        <button type="button" className="finance-modal-proposal-btn" onClick={handleProposalSubmit} disabled={proposalSubmitting}>
                          {proposalSubmitting ? "Enviando..." : "Enviar proposta"}
                        </button>
                        {proposalSent ? <p className="finance-modal-proposal-success">Proposta enviada! Nossa equipe retornará em breve.</p> : null}
                      </div>
                    ) : (
                      <div className="finance-modal-form">
                        <h4>Simule seu financiamento</h4>
                        <label htmlFor={`entrada-${financeId}`}>Entrada</label>
                        <input
                          id={`entrada-${financeId}`}
                          type="text"
                          inputMode="numeric"
                          value={entryInput}
                          onChange={(event) => handleEntryChange(event.target.value)}
                        />
                        {entryError ? <small className="finance-modal-entry-error">{entryError}</small> : null}

                        <label htmlFor={`parcelas-${financeId}`}>Parcelas</label>
                        <select
                          id={`parcelas-${financeId}`}
                          value={installments}
                          onChange={(event) => handleInstallmentsChange(Number(event.target.value))}
                        >
                          {installmentOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}x
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="finance-modal-simulate-btn"
                    onClick={handleSimulateFinance}
                    disabled={showProposalForm ? false : isSimulatingFinance || hasMinEntryError}
                  >
                    {isSimulatingFinance ? (
                      <>
                        <LoaderCircle size={18} className="spin" /> Calculando parcelas...
                      </>
                    ) : (
                      <>
                        <WalletCards size={18} /> {resultLabel}
                      </>
                    )}
                  </button>

                  <p className="finance-modal-security">
                    <ShieldCheck size={18} /> Simulacao feita apenas para consulta. Fale com um dos nossos consultores para uma simulacao real.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FinanceFollowUpModal
        open={isFinanceFollowUpOpen}
        onClose={() => setIsFinanceFollowUpOpen(false)}
        context={{
          form: "financiamento-card",
          subject: "Financiamento",
          unitName: store,
          vehicle: leadVehicleContext,
          message: `Veículo: ${name}\nPreço: ${price}`
        }}
      />
    </>
  );
}
