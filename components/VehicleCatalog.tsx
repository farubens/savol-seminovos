"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { ApiVehicle } from "@/types/home";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";
import { SellYourCarCta } from "@/components/SellYourCarCta";
import { VehicleOfferCard } from "@/components/VehicleOfferCard";
import { getBodyInfo as getClassifiedBodyInfo, getCategoryInfo as getClassifiedCategoryInfo, isElectricVehicle, isHybridVehicle } from "@/lib/vehicleClassification";

const DEFAULT_SORT = "destaques";
const PAGE_SIZE = 20;
const LOAD_MORE_DELAY_MS = 350;

type OptionEntry = [slug: string, label: string];
type BodyInfo = { slug: string; label: string };
type CategoryInfo = { slug: string; label: string };

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function toSlug(value: string): string {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseListParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePriceValue(value: string): number | null {
  if (!value) return null;
  let cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/\./g, "");
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseKmValue(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseYearValue(value: string): number | null {
  const matched = value.match(/(19|20)\d{2}/);
  if (!matched) return null;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoundParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function clampNumber(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeOptionalRange(minValue: number | null, maxValue: number | null, boundMin: number, boundMax: number) {
  let min = minValue == null ? null : clampNumber(minValue, boundMin, boundMax);
  let max = maxValue == null ? null : clampNumber(maxValue, boundMin, boundMax);

  if (min != null && max != null && min > max) {
    [min, max] = [max, min];
  }

  return { min, max };
}

function toPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return ((value - min) / (max - min)) * 100;
}

function formatPriceValue(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
}

function formatKmValue(value: number): string {
  return `${new Intl.NumberFormat("pt-BR").format(value)} km`;
}

function buildOptionEntries(values: string[]): OptionEntry[] {
  const map = new Map<string, string>();

  for (const rawValue of values) {
    const label = rawValue.trim();
    if (!label) continue;
    const normalized = normalize(label);
    if (!normalized || normalized.includes("nao informado") || normalized.includes("n/a")) continue;
    const slug = toSlug(label);
    if (!slug) continue;
    if (!map.has(slug)) map.set(slug, label);
  }

  return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
}

function getBodyInfo(vehicle: ApiVehicle): BodyInfo {
  const source = normalize(`${vehicle.name} ${vehicle.model} ${vehicle.version}`);

  if (source.includes("suv") || source.includes("crossover")) return { slug: "suv", label: "SUV" };
  if (source.includes("hatch")) return { slug: "hatch", label: "Hatch" };
  if (source.includes("sedan")) return { slug: "sedan", label: "Sedan" };
  if (source.includes("caminhonete") || source.includes("pickup") || source.includes("cabine")) return { slug: "pickup", label: "Pickup" };
  if (source.includes("coupe") || source.includes("cupe")) return { slug: "coupe", label: "Coupé" };
  if (source.includes("perua") || source.includes("wagon")) return { slug: "wagon", label: "Wagon" };
  if (source.includes("van") || source.includes("furg") || source.includes("minivan")) return { slug: "van", label: "Van" };

  return { slug: "outros", label: "Outros" };
}

function getCategoryInfo(body: BodyInfo): CategoryInfo {
  if (body.slug === "suv") return { slug: "suv-crossover", label: "SUV e Crossover" };
  if (body.slug === "pickup") return { slug: "trabalho", label: "Trabalho" };
  if (body.slug === "van") return { slug: "utilitarios", label: "Utilitários" };
  if (body.slug === "hatch" || body.slug === "sedan" || body.slug === "coupe" || body.slug === "wagon") return { slug: "passeio", label: "Passeio" };
  return { slug: "outros", label: "Outros" };
}

function buildQueryString(options: {
  stores: string[];
  brands: string[];
  models: string[];
  categories: string[];
  transmissions: string[];
  colors: string[];
  fuels: string[];
  bodies: string[];
  energy: string;
  yearMin: number | null;
  yearMax: number | null;
  priceMin: number | null;
  priceMax: number | null;
  kmMin: number | null;
  kmMax: number | null;
  query: string;
  sort: string;
  aiMock?: boolean;
  aiSeed?: string | null;
}): string {
  const params = new URLSearchParams();

  if (options.stores.length) params.set("stores", options.stores.join(","));
  if (options.brands.length) params.set("brands", options.brands.join(","));
  if (options.models.length) params.set("models", options.models.join(","));
  if (options.categories.length) params.set("categories", options.categories.join(","));
  if (options.transmissions.length) params.set("transmissions", options.transmissions.join(","));
  if (options.colors.length) params.set("colors", options.colors.join(","));
  if (options.fuels.length) params.set("fuels", options.fuels.join(","));
  if (options.bodies.length) params.set("bodies", options.bodies.join(","));
  if (options.energy) params.set("energy", options.energy);

  if (options.yearMin != null) params.set("yearMin", String(options.yearMin));
  if (options.yearMax != null) params.set("yearMax", String(options.yearMax));
  if (options.priceMin != null) params.set("priceMin", String(options.priceMin));
  if (options.priceMax != null) params.set("priceMax", String(options.priceMax));
  if (options.kmMin != null) params.set("kmMin", String(options.kmMin));
  if (options.kmMax != null) params.set("kmMax", String(options.kmMax));

  if (options.query.trim()) params.set("q", options.query.trim());
  if (options.sort !== DEFAULT_SORT) params.set("sort", options.sort);
  if (options.aiMock) params.set("aiMock", "1");
  if (options.aiMock && options.aiSeed) params.set("aiSeed", options.aiSeed);

  return params.toString();
}

function toggleListValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const shuffled = [...items];
  const random = createSeededRandom(seed || 1);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[index]];
  }
  return shuffled;
}

export function VehicleCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const { vehicles, loading } = useHomeSessionData();
  const loadMoreRef = useRef<HTMLParagraphElement | null>(null);
  const isLoadingMoreRef = useRef(false);
  const visibleCountRef = useRef(PAGE_SIZE);
  const resultLengthRef = useRef(0);
  const loadMoreTimeoutRef = useRef<number | null>(null);
  const lastSearchKeyRef = useRef(searchKey);

  const [isHydrated, setIsHydrated] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCatalogRefreshing, setIsCatalogRefreshing] = useState(Boolean(searchKey));

  const storesParam = searchParams.get("stores");
  const brandsParam = searchParams.get("brands");
  const modelsParam = searchParams.get("models");
  const categoriesParam = searchParams.get("categories");
  const transmissionsParam = searchParams.get("transmissions");
  const colorsParam = searchParams.get("colors");
  const fuelsParam = searchParams.get("fuels");
  const bodiesParam = searchParams.get("bodies");
  const energyParam = searchParams.get("energy");

  const legacyStoreParam = searchParams.get("store");
  const legacyBrandParam = searchParams.get("brand");
  const legacyModelParam = searchParams.get("model");
  const legacyMaxPriceParam = searchParams.get("maxPrice");

  const yearMinParam = searchParams.get("yearMin");
  const yearMaxParam = searchParams.get("yearMax");
  const priceMinParam = searchParams.get("priceMin");
  const priceMaxParam = searchParams.get("priceMax");
  const kmMinParam = searchParams.get("kmMin");
  const kmMaxParam = searchParams.get("kmMax");

  const queryParam = searchParams.get("q");
  const aiMockParam = searchParams.get("aiMock");
  const aiSeedParam = searchParams.get("aiSeed");
  const sortParam = searchParams.get("sort");

  const urlStores = useMemo(() => parseListParam(storesParam), [storesParam]);
  const urlBrands = useMemo(() => parseListParam(brandsParam), [brandsParam]);
  const urlModels = useMemo(() => parseListParam(modelsParam), [modelsParam]);
  const urlCategories = useMemo(() => parseListParam(categoriesParam), [categoriesParam]);
  const urlTransmissions = useMemo(() => parseListParam(transmissionsParam), [transmissionsParam]);
  const urlColors = useMemo(() => parseListParam(colorsParam), [colorsParam]);
  const urlFuels = useMemo(() => parseListParam(fuelsParam), [fuelsParam]);
  const urlBodies = useMemo(() => parseListParam(bodiesParam), [bodiesParam]);
  const urlEnergy = energyParam === "eletrico" || energyParam === "hibrido" ? energyParam : "";

  const legacyStore = legacyStoreParam ?? "all";
  const legacyBrand = legacyBrandParam ?? "all";
  const legacyModel = legacyModelParam ?? "all";
  const legacyMaxPrice = useMemo(() => parseBoundParam(legacyMaxPriceParam), [legacyMaxPriceParam]);

  const urlYearMin = useMemo(() => parseBoundParam(yearMinParam), [yearMinParam]);
  const urlYearMax = useMemo(() => parseBoundParam(yearMaxParam), [yearMaxParam]);
  const urlPriceMin = useMemo(() => parseBoundParam(priceMinParam), [priceMinParam]);
  const urlPriceMaxBase = useMemo(() => parseBoundParam(priceMaxParam), [priceMaxParam]);
  const urlPriceMax = urlPriceMaxBase ?? legacyMaxPrice;
  const urlKmMin = useMemo(() => parseBoundParam(kmMinParam), [kmMinParam]);
  const urlKmMax = useMemo(() => parseBoundParam(kmMaxParam), [kmMaxParam]);

  const urlQuery = queryParam ?? "";
  const isAiMock = aiMockParam === "1";
  const aiSeed = useMemo(() => {
    const parsed = Number.parseInt(aiSeedParam ?? "", 10);
    if (Number.isNaN(parsed)) return 1;
    return parsed;
  }, [aiSeedParam]);
  const urlSort = sortParam ?? DEFAULT_SORT;

  const [selectedStores, setSelectedStores] = useState<string[]>(urlStores.length ? urlStores : legacyStore !== "all" ? [legacyStore] : []);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(urlBrands.length ? urlBrands : legacyBrand !== "all" ? [legacyBrand] : []);
  const [selectedModels, setSelectedModels] = useState<string[]>(urlModels.length ? urlModels : legacyModel !== "all" ? [legacyModel] : []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(urlCategories);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>(urlTransmissions);
  const [selectedColors, setSelectedColors] = useState<string[]>(urlColors);
  const [selectedFuels, setSelectedFuels] = useState<string[]>(urlFuels);
  const [selectedBodies, setSelectedBodies] = useState<string[]>(urlBodies);
  const [selectedEnergy, setSelectedEnergy] = useState(urlEnergy);

  const [yearMin, setYearMin] = useState<number | null>(urlYearMin);
  const [yearMax, setYearMax] = useState<number | null>(urlYearMax);
  const [priceMin, setPriceMin] = useState<number | null>(urlPriceMin);
  const [priceMax, setPriceMax] = useState<number | null>(urlPriceMax);
  const [kmMin, setKmMin] = useState<number | null>(urlKmMin);
  const [kmMax, setKmMax] = useState<number | null>(urlKmMax);

  const [query, setQuery] = useState(urlQuery);
  const [sort, setSort] = useState(urlSort);

  useEffect(() => {
    setSelectedStores(urlStores.length ? urlStores : legacyStore !== "all" ? [legacyStore] : []);
    setSelectedBrands(urlBrands.length ? urlBrands : legacyBrand !== "all" ? [legacyBrand] : []);
    setSelectedModels(urlModels.length ? urlModels : legacyModel !== "all" ? [legacyModel] : []);
    setSelectedCategories(urlCategories);
    setSelectedTransmissions(urlTransmissions);
    setSelectedColors(urlColors);
    setSelectedFuels(urlFuels);
    setSelectedBodies(urlBodies);
    setSelectedEnergy(urlEnergy);

    setYearMin(urlYearMin);
    setYearMax(urlYearMax);
    setPriceMin(urlPriceMin);
    setPriceMax(urlPriceMax);
    setKmMin(urlKmMin);
    setKmMax(urlKmMax);

    setQuery(urlQuery);
    setSort(urlSort);

    if (lastSearchKeyRef.current !== searchKey) {
      lastSearchKeyRef.current = searchKey;
      setIsCatalogRefreshing(true);
    }
  }, [
    searchKey,
    urlStores,
    urlBrands,
    urlModels,
    urlCategories,
    urlTransmissions,
    urlColors,
    urlFuels,
    urlBodies,
    urlEnergy,
    legacyStore,
    legacyBrand,
    legacyModel,
    urlYearMin,
    urlYearMax,
    urlPriceMin,
    urlPriceMax,
    urlKmMin,
    urlKmMax,
    urlQuery,
    urlSort
  ]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isMobileFiltersOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileFiltersOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileFiltersOpen]);

  const stores = useMemo(() => buildOptionEntries(vehicles.map((vehicle) => vehicle.store)), [vehicles]);
  const brands = useMemo(() => buildOptionEntries(vehicles.map((vehicle) => vehicle.brand)), [vehicles]);
  const models = useMemo(() => {
    return buildOptionEntries(
      vehicles
        .filter((vehicle) => selectedBrands.length === 0 || selectedBrands.includes(toSlug(vehicle.brand)))
        .map((vehicle) => vehicle.model)
    );
  }, [vehicles, selectedBrands]);
  const transmissions = useMemo(() => buildOptionEntries(vehicles.map((vehicle) => vehicle.transmission)), [vehicles]);
  const colors = useMemo(() => buildOptionEntries(vehicles.map((vehicle) => vehicle.color)), [vehicles]);
  const fuels = useMemo(() => buildOptionEntries(vehicles.map((vehicle) => vehicle.fuel)), [vehicles]);

  const bodies = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      const body = getClassifiedBodyInfo(vehicle);
      if (!map.has(body.slug)) map.set(body.slug, body.label);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [vehicles]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      const category = getClassifiedCategoryInfo(getClassifiedBodyInfo(vehicle));
      if (!map.has(category.slug)) map.set(category.slug, category.label);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [vehicles]);

  const yearOptions = useMemo(() => {
    const values = vehicles
      .map((vehicle) => parseYearValue(vehicle.year))
      .filter((value): value is number => value != null);
    return Array.from(new Set(values)).sort((a, b) => b - a);
  }, [vehicles]);

  const priceBounds = useMemo(() => {
    const values = vehicles.map((vehicle) => parsePriceValue(vehicle.price)).filter((value): value is number => value != null);
    if (!values.length) return { min: 0, max: 0 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [vehicles]);

  const kmBounds = useMemo(() => {
    const values = vehicles.map((vehicle) => parseKmValue(vehicle.km)).filter((value): value is number => value != null);
    if (!values.length) return { min: 0, max: 0 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [vehicles]);

  const priceSliderMinBound = priceBounds.min;
  const priceSliderMaxBound = priceBounds.max > priceBounds.min ? priceBounds.max : priceBounds.min + 1;
  const kmSliderMinBound = kmBounds.min;
  const kmSliderMaxBound = kmBounds.max > kmBounds.min ? kmBounds.max : kmBounds.min + 1;

  const normalizedPriceRange = normalizeOptionalRange(priceMin, priceMax, priceSliderMinBound, priceSliderMaxBound);
  const normalizedKmRange = normalizeOptionalRange(kmMin, kmMax, kmSliderMinBound, kmSliderMaxBound);

  const sliderPriceMin = normalizedPriceRange.min ?? priceSliderMinBound;
  const sliderPriceMax = normalizedPriceRange.max ?? priceSliderMaxBound;
  const sliderKmMin = normalizedKmRange.min ?? kmSliderMinBound;
  const sliderKmMax = normalizedKmRange.max ?? kmSliderMaxBound;

  const priceLeftPercent = toPercent(sliderPriceMin, priceSliderMinBound, priceSliderMaxBound);
  const priceRightPercent = toPercent(sliderPriceMax, priceSliderMinBound, priceSliderMaxBound);
  const kmLeftPercent = toPercent(sliderKmMin, kmSliderMinBound, kmSliderMaxBound);
  const kmRightPercent = toPercent(sliderKmMax, kmSliderMinBound, kmSliderMaxBound);

  const filteredVehicles = useMemo(() => {
    const queryTokens = normalize(query)
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    return vehicles.filter((vehicle) => {
      const vehicleStore = toSlug(vehicle.store);
      const vehicleBrand = toSlug(vehicle.brand);
      const vehicleModel = toSlug(vehicle.model);
      const vehicleTransmission = toSlug(vehicle.transmission);
      const vehicleColor = toSlug(vehicle.color);
      const vehicleFuel = toSlug(vehicle.fuel);
      const body = getClassifiedBodyInfo(vehicle);
      const category = getClassifiedCategoryInfo(body);
      const isElectric = isElectricVehicle(vehicle);
      const isHybrid = isHybridVehicle(vehicle);

      if (selectedStores.length > 0 && !selectedStores.includes(vehicleStore)) return false;
      if (selectedBrands.length > 0 && !selectedBrands.includes(vehicleBrand)) return false;
      if (selectedModels.length > 0 && !selectedModels.includes(vehicleModel)) return false;
      if (selectedTransmissions.length > 0 && !selectedTransmissions.includes(vehicleTransmission)) return false;
      if (selectedColors.length > 0 && !selectedColors.includes(vehicleColor)) return false;
      if (selectedFuels.length > 0 && !selectedFuels.includes(vehicleFuel)) return false;
      if (selectedBodies.length > 0 && !selectedBodies.includes(body.slug)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(category.slug)) return false;
      if (selectedEnergy === "eletrico" && !isElectric) return false;
      if (selectedEnergy === "hibrido" && !isHybrid) return false;

      const vehicleYear = parseYearValue(vehicle.year);
      if (yearMin != null && (vehicleYear == null || vehicleYear < yearMin)) return false;
      if (yearMax != null && (vehicleYear == null || vehicleYear > yearMax)) return false;

      const vehiclePrice = parsePriceValue(vehicle.price);
      if (normalizedPriceRange.min != null && (vehiclePrice == null || vehiclePrice < normalizedPriceRange.min)) return false;
      if (normalizedPriceRange.max != null && (vehiclePrice == null || vehiclePrice > normalizedPriceRange.max)) return false;

      const vehicleKm = parseKmValue(vehicle.km);
      if (normalizedKmRange.min != null && (vehicleKm == null || vehicleKm < normalizedKmRange.min)) return false;
      if (normalizedKmRange.max != null && (vehicleKm == null || vehicleKm > normalizedKmRange.max)) return false;

      if (queryTokens.length) {
        const searchable = normalize(
          [
            vehicle.name,
            vehicle.subtitle,
            vehicle.brand,
            vehicle.model,
            vehicle.version,
            vehicle.fuel,
            vehicle.transmission,
            vehicle.year,
            vehicle.km,
            vehicle.store,
            vehicle.color,
            body.label,
            category.label,
            isElectric ? "eletrico 100 eletrico ev bev" : "",
            isHybrid ? "hibrido hybrid hev mhev phev plug-in" : ""
          ].join(" ")
        );

        const matchesAll = queryTokens.every((token) => searchable.includes(token));
        if (!matchesAll) return false;
      }

      return true;
    });
  }, [
    vehicles,
    selectedStores,
    selectedBrands,
    selectedModels,
    selectedTransmissions,
    selectedColors,
    selectedFuels,
    selectedBodies,
    selectedCategories,
    selectedEnergy,
    yearMin,
    yearMax,
    normalizedPriceRange.min,
    normalizedPriceRange.max,
    normalizedKmRange.min,
    normalizedKmRange.max,
    query
  ]);

  const sortedVehicles = useMemo(() => {
    const base = [...filteredVehicles];

    if (sort === "price_asc") {
      base.sort((a, b) => (parsePriceValue(a.price) ?? Number.POSITIVE_INFINITY) - (parsePriceValue(b.price) ?? Number.POSITIVE_INFINITY));
    } else if (sort === "price_desc") {
      base.sort((a, b) => (parsePriceValue(b.price) ?? 0) - (parsePriceValue(a.price) ?? 0));
    } else if (sort === "km_asc") {
      base.sort((a, b) => (parseKmValue(a.km) ?? Number.POSITIVE_INFINITY) - (parseKmValue(b.km) ?? Number.POSITIVE_INFINITY));
    } else if (sort === "year_desc") {
      base.sort((a, b) => (parseYearValue(b.year) ?? 0) - (parseYearValue(a.year) ?? 0));
    }

    return base;
  }, [filteredVehicles, sort]);

  const resultVehicles = useMemo(() => {
    if (!isAiMock) return sortedVehicles;
    return seededShuffle(filteredVehicles, aiSeed).slice(0, 5);
  }, [isAiMock, filteredVehicles, sortedVehicles, aiSeed]);

  const visibleVehicles = useMemo(() => resultVehicles.slice(0, visibleCount), [resultVehicles, visibleCount]);
  const hasMoreVehicles = visibleCount < resultVehicles.length;
  const loadMoreSkeletonCount = Math.min(PAGE_SIZE, Math.max(resultVehicles.length - visibleCount, 0));
  const isUrlRefreshing = searchKey !== lastSearchKeyRef.current;
  const isResultsLoading = loading || isCatalogRefreshing || isUrlRefreshing;

  useEffect(() => {
    if (loading || !isCatalogRefreshing) return;

    const timeoutId = window.setTimeout(() => {
      setIsCatalogRefreshing(false);
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [isCatalogRefreshing, loading, resultVehicles.length]);

  useEffect(() => {
    if (loadMoreTimeoutRef.current != null) {
      window.clearTimeout(loadMoreTimeoutRef.current);
      loadMoreTimeoutRef.current = null;
    }
    setVisibleCount(PAGE_SIZE);
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
  }, [resultVehicles]);

  useEffect(() => {
    visibleCountRef.current = visibleCount;
  }, [visibleCount]);

  useEffect(() => {
    resultLengthRef.current = resultVehicles.length;
  }, [resultVehicles.length]);

  const loadNextVehicleBatch = useCallback(() => {
    if (isLoadingMoreRef.current) return;
    if (visibleCountRef.current >= resultLengthRef.current) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    loadMoreTimeoutRef.current = window.setTimeout(() => {
      setVisibleCount((current) => Math.min(current + PAGE_SIZE, resultLengthRef.current));
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
      loadMoreTimeoutRef.current = null;
    }, LOAD_MORE_DELAY_MS);
  }, []);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || loading || !hasMoreVehicles) return;

    let frameId = 0;

    const isTargetVisible = () => {
      const rect = target.getBoundingClientRect();
      return rect.top <= window.innerHeight && rect.bottom >= 0;
    };

    const loadIfMessageIsVisible = () => {
      if (!isTargetVisible()) return;
      loadNextVehicleBatch();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadNextVehicleBatch();
      },
      { rootMargin: "0px" }
    );

    observer.observe(target);
    window.addEventListener("scroll", loadIfMessageIsVisible, { passive: true });
    window.addEventListener("resize", loadIfMessageIsVisible);

    frameId = window.requestAnimationFrame(loadIfMessageIsVisible);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", loadIfMessageIsVisible);
      window.removeEventListener("resize", loadIfMessageIsVisible);
      observer.disconnect();
    };
  }, [hasMoreVehicles, loadNextVehicleBatch, loading, resultVehicles.length]);

  const pushQuery = (nextSort = sort) => {
    const priceRange = normalizeOptionalRange(priceMin, priceMax, priceSliderMinBound, priceSliderMaxBound);
    const kmRange = normalizeOptionalRange(kmMin, kmMax, kmSliderMinBound, kmSliderMaxBound);

    const queryString = buildQueryString({
      stores: selectedStores,
      brands: selectedBrands,
      models: selectedModels,
      categories: selectedCategories,
      transmissions: selectedTransmissions,
      colors: selectedColors,
      fuels: selectedFuels,
      bodies: selectedBodies,
      energy: selectedEnergy,
      yearMin,
      yearMax,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      kmMin: kmRange.min,
      kmMax: kmRange.max,
      query,
      sort: nextSort,
      aiMock: isAiMock,
      aiSeed: aiSeedParam
    });

    setIsCatalogRefreshing(true);
    router.push(`/veiculos${queryString ? `?${queryString}` : ""}`);
  };

  const applyFilters = () => {
    pushQuery();
    setIsMobileFiltersOpen(false);
  };

  const handleFilterButtonClick = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches) {
      setIsMobileFiltersOpen(true);
      return;
    }

    setShowFilters((current) => !current);
  };

  const clearFilters = () => {
    setSelectedStores([]);
    setSelectedBrands([]);
    setSelectedModels([]);
    setSelectedCategories([]);
    setSelectedTransmissions([]);
    setSelectedColors([]);
    setSelectedFuels([]);
    setSelectedBodies([]);
    setSelectedEnergy("");

    setYearMin(null);
    setYearMax(null);
    setPriceMin(null);
    setPriceMax(null);
    setKmMin(null);
    setKmMax(null);

    setQuery("");
    setSort(DEFAULT_SORT);

    setIsCatalogRefreshing(true);
    router.push("/veiculos");
  };

  const labelMaps = useMemo(() => {
    return {
      stores: new Map(stores),
      brands: new Map(brands),
      models: new Map(models),
      categories: new Map(categories),
      transmissions: new Map(transmissions),
      colors: new Map(colors),
      fuels: new Map(fuels),
      bodies: new Map(bodies)
    };
  }, [stores, brands, models, categories, transmissions, colors, fuels, bodies]);

  const activeFilterCount =
    selectedStores.length +
    selectedBrands.length +
    selectedModels.length +
    selectedCategories.length +
    selectedTransmissions.length +
    selectedColors.length +
    selectedFuels.length +
    selectedBodies.length +
    (selectedEnergy ? 1 : 0) +
    (yearMin != null ? 1 : 0) +
    (yearMax != null ? 1 : 0) +
    (priceMin != null || priceMax != null ? 1 : 0) +
    (kmMin != null || kmMax != null ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const chips = [
    ...selectedStores.map((slug) => ({
      key: `store-${slug}`,
      label: labelMaps.stores.get(slug) ?? slug,
      remove: () => setSelectedStores((current) => current.filter((item) => item !== slug))
    })),
    ...selectedBrands.map((slug) => ({
      key: `brand-${slug}`,
      label: labelMaps.brands.get(slug) ?? slug,
      remove: () => setSelectedBrands((current) => current.filter((item) => item !== slug))
    })),
    ...selectedModels.map((slug) => ({
      key: `model-${slug}`,
      label: labelMaps.models.get(slug) ?? slug,
      remove: () => setSelectedModels((current) => current.filter((item) => item !== slug))
    })),
    ...selectedCategories.map((slug) => ({
      key: `category-${slug}`,
      label: labelMaps.categories.get(slug) ?? slug,
      remove: () => setSelectedCategories((current) => current.filter((item) => item !== slug))
    })),
    ...selectedTransmissions.map((slug) => ({
      key: `trans-${slug}`,
      label: labelMaps.transmissions.get(slug) ?? slug,
      remove: () => setSelectedTransmissions((current) => current.filter((item) => item !== slug))
    })),
    ...selectedColors.map((slug) => ({
      key: `color-${slug}`,
      label: labelMaps.colors.get(slug) ?? slug,
      remove: () => setSelectedColors((current) => current.filter((item) => item !== slug))
    })),
    ...selectedFuels.map((slug) => ({
      key: `fuel-${slug}`,
      label: labelMaps.fuels.get(slug) ?? slug,
      remove: () => setSelectedFuels((current) => current.filter((item) => item !== slug))
    })),
    ...selectedBodies.map((slug) => ({
      key: `body-${slug}`,
      label: labelMaps.bodies.get(slug) ?? slug,
      remove: () => setSelectedBodies((current) => current.filter((item) => item !== slug))
    })),
    ...(selectedEnergy
      ? [
          {
            key: `energy-${selectedEnergy}`,
            label: selectedEnergy === "eletrico" ? "Elétricos" : "Híbridos",
            remove: () => setSelectedEnergy("")
          }
        ]
      : []),
    ...(yearMin != null
      ? [
          {
            key: "year-min",
            label: `Ano mín. ${yearMin}`,
            remove: () => setYearMin(null)
          }
        ]
      : []),
    ...(yearMax != null
      ? [
          {
            key: "year-max",
            label: `Ano máx. ${yearMax}`,
            remove: () => setYearMax(null)
          }
        ]
      : []),
    ...(priceMin != null || priceMax != null
      ? [
          {
            key: "price-range",
            label: `Preço ${formatPriceValue(priceMin ?? priceSliderMinBound)} - ${formatPriceValue(priceMax ?? priceSliderMaxBound)}`,
            remove: () => {
              setPriceMin(null);
              setPriceMax(null);
            }
          }
        ]
      : []),
    ...(kmMin != null || kmMax != null
      ? [
          {
            key: "km-range",
            label: `Km ${formatKmValue(kmMin ?? kmSliderMinBound)} - ${formatKmValue(kmMax ?? kmSliderMaxBound)}`,
            remove: () => {
              setKmMin(null);
              setKmMax(null);
            }
          }
        ]
      : []),
    ...(query.trim()
      ? [
          {
            key: "query",
            label: `Busca: ${query.trim()}`,
            remove: () => setQuery("")
          }
        ]
      : [])
  ];

  if (!isHydrated) {
    return (
      <section className="catalog-shell catalog-shell--full">
        <p className="catalog-breadcrumb">Home &gt; Veículos</p>
      </section>
    );
  }

  return (
    <>
      <section className="catalog-shell catalog-shell--full">
        <div className="catalog-full-toolbar">
          <div className="catalog-toolbar-left">
            <button type="button" className="catalog-toggle-filters-btn" onClick={handleFilterButtonClick}>
              <SlidersHorizontal size={14} /> Filtros ({activeFilterCount})
            </button>

            {chips.map((chip) => (
              <button key={chip.key} type="button" className="catalog-filter-chip" onClick={chip.remove}>
                {chip.label} <X size={12} />
              </button>
            ))}

            {chips.length > 0 && (
              <button type="button" className="catalog-clear-chip-btn" onClick={clearFilters}>
                Remover tudo
              </button>
            )}
          </div>

          <label className="catalog-sort catalog-sort--toolbar">
            Ordenar por
            <select
              value={sort}
              onChange={(event) => {
                const nextSort = event.target.value;
                setSort(nextSort);
                pushQuery(nextSort);
              }}
            >
              <option value="destaques">Destaques</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
              <option value="km_asc">Menor km</option>
              <option value="year_desc">Mais novos</option>
            </select>
          </label>
        </div>

        <div className={`catalog-layout-grid catalog-layout-grid--full${showFilters ? "" : " is-filters-collapsed"}`}>
          {isMobileFiltersOpen ? <button type="button" className="catalog-mobile-filter-backdrop" aria-label="Fechar filtros" onClick={() => setIsMobileFiltersOpen(false)} /> : null}
          {(showFilters || isMobileFiltersOpen) && (
            <aside className={`catalog-sidebar catalog-sidebar--full${isMobileFiltersOpen ? " is-mobile-open" : ""}`} aria-label="Filtros de veículos">
              <article className="catalog-filter-card catalog-filter-card--full">
                <header className="catalog-filter-head">
                  <h2>
                    <SlidersHorizontal size={18} /> Filtros
                  </h2>
                  <button type="button" className="catalog-filter-close-btn" onClick={() => setIsMobileFiltersOpen(false)} aria-label="Fechar filtros">
                    <X size={18} />
                  </button>
                  <button type="button" onClick={clearFilters}>
                    Limpar filtros
                  </button>
                </header>

                <details className="catalog-filter-block">
                  <summary>Lojas</summary>
                  <div className="catalog-checklist">
                    {stores.map(([slug, label]) => (
                      <label key={slug} className="catalog-check-item">
                        <input type="checkbox" checked={selectedStores.includes(slug)} onChange={() => setSelectedStores((current) => toggleListValue(current, slug))} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </details>

                <details className="catalog-filter-block">
                  <summary>Categorias</summary>
                  <div className="catalog-checklist">
                    {categories.map(([slug, label]) => (
                      <label key={slug} className="catalog-check-item">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(slug)}
                          onChange={() => setSelectedCategories((current) => toggleListValue(current, slug))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </details>

                <details className="catalog-filter-block">
                  <summary>Marcas</summary>
                  <div className="catalog-checklist">
                    {brands.map(([slug, label]) => (
                      <label key={slug} className="catalog-check-item">
                        <input type="checkbox" checked={selectedBrands.includes(slug)} onChange={() => setSelectedBrands((current) => toggleListValue(current, slug))} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </details>

                <details className="catalog-filter-block">
                  <summary>Modelo</summary>
                  <div className="catalog-checklist">
                    {models.map(([slug, label]) => (
                      <label key={slug} className="catalog-check-item">
                        <input type="checkbox" checked={selectedModels.includes(slug)} onChange={() => setSelectedModels((current) => toggleListValue(current, slug))} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </details>

                <details className="catalog-filter-block">
                  <summary>Ano</summary>
                  <div className="catalog-range-inputs">
                    <label>
                      Mínimo
                      <select
                        value={yearMin != null ? String(yearMin) : ""}
                        onChange={(event) => {
                          const value = event.target.value ? Number(event.target.value) : null;
                          setYearMin(value);
                          if (value != null && yearMax != null && value > yearMax) setYearMax(value);
                        }}
                      >
                        <option value="">Sem mínimo</option>
                        {yearOptions.map((option) => (
                          <option key={`year-min-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Máximo
                      <select
                        value={yearMax != null ? String(yearMax) : ""}
                        onChange={(event) => {
                          const value = event.target.value ? Number(event.target.value) : null;
                          setYearMax(value);
                          if (value != null && yearMin != null && value < yearMin) setYearMin(value);
                        }}
                      >
                        <option value="">Sem máximo</option>
                        {yearOptions.map((option) => (
                          <option key={`year-max-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </details>

                <details className="catalog-filter-block">
                  <summary>Km</summary>
                  <div className="catalog-range-group">
                    <div className="catalog-range-slider" aria-label="Faixa de quilometragem">
                      <div className="catalog-range-track" />
                      <div className="catalog-range-active" style={{ left: `${kmLeftPercent}%`, width: `${Math.max(0, kmRightPercent - kmLeftPercent)}%` }} />

                      <span className="catalog-range-badge is-min" style={{ left: `${kmLeftPercent}%` }}>
                        {formatKmValue(sliderKmMin)}
                      </span>
                      <span className="catalog-range-badge is-max" style={{ left: `${kmRightPercent}%` }}>
                        {formatKmValue(sliderKmMax)}
                      </span>

                      <input
                        className="catalog-range-input is-min"
                        type="range"
                        min={kmSliderMinBound}
                        max={kmSliderMaxBound}
                        step={1000}
                        value={sliderKmMin}
                        onChange={(event) => {
                          const next = Math.min(Number(event.target.value), sliderKmMax);
                          setKmMin(next);
                        }}
                        aria-label="Quilometragem mínima"
                      />
                      <input
                        className="catalog-range-input is-max"
                        type="range"
                        min={kmSliderMinBound}
                        max={kmSliderMaxBound}
                        step={1000}
                        value={sliderKmMax}
                        onChange={(event) => {
                          const next = Math.max(Number(event.target.value), sliderKmMin);
                          setKmMax(next);
                        }}
                        aria-label="Quilometragem máxima"
                      />
                    </div>

                    <div className="catalog-range-inputs">
                      <label>
                        Mínimo
                        <input
                          type="number"
                          min={kmSliderMinBound}
                          max={kmSliderMaxBound}
                          step={1000}
                          value={kmMin ?? ""}
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (!raw) {
                              setKmMin(null);
                              return;
                            }
                            const parsed = Number(raw);
                            if (!Number.isFinite(parsed)) return;
                            const next = clampNumber(parsed, kmSliderMinBound, kmSliderMaxBound);
                            setKmMin(next);
                            if (kmMax != null && next > kmMax) setKmMax(next);
                          }}
                          placeholder="Sem mínimo"
                        />
                      </label>
                      <label>
                        Máximo
                        <input
                          type="number"
                          min={kmSliderMinBound}
                          max={kmSliderMaxBound}
                          step={1000}
                          value={kmMax ?? ""}
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (!raw) {
                              setKmMax(null);
                              return;
                            }
                            const parsed = Number(raw);
                            if (!Number.isFinite(parsed)) return;
                            const next = clampNumber(parsed, kmSliderMinBound, kmSliderMaxBound);
                            setKmMax(next);
                            if (kmMin != null && next < kmMin) setKmMin(next);
                          }}
                          placeholder="Sem máximo"
                        />
                      </label>
                    </div>
                  </div>
                </details>

                <details className="catalog-filter-block">
                  <summary>Preço</summary>
                  <div className="catalog-range-group">
                    <div className="catalog-range-slider" aria-label="Faixa de preço">
                      <div className="catalog-range-track" />
                      <div className="catalog-range-active" style={{ left: `${priceLeftPercent}%`, width: `${Math.max(0, priceRightPercent - priceLeftPercent)}%` }} />

                      <span className="catalog-range-badge is-min" style={{ left: `${priceLeftPercent}%` }}>
                        {formatPriceValue(sliderPriceMin)}
                      </span>
                      <span className="catalog-range-badge is-max" style={{ left: `${priceRightPercent}%` }}>
                        {formatPriceValue(sliderPriceMax)}
                      </span>

                      <input
                        className="catalog-range-input is-min"
                        type="range"
                        min={priceSliderMinBound}
                        max={priceSliderMaxBound}
                        step={1000}
                        value={sliderPriceMin}
                        onChange={(event) => {
                          const next = Math.min(Number(event.target.value), sliderPriceMax);
                          setPriceMin(next);
                        }}
                        aria-label="Preço mínimo"
                      />
                      <input
                        className="catalog-range-input is-max"
                        type="range"
                        min={priceSliderMinBound}
                        max={priceSliderMaxBound}
                        step={1000}
                        value={sliderPriceMax}
                        onChange={(event) => {
                          const next = Math.max(Number(event.target.value), sliderPriceMin);
                          setPriceMax(next);
                        }}
                        aria-label="Preço máximo"
                      />
                    </div>

                    <div className="catalog-range-inputs">
                      <label>
                        Mínimo
                        <input
                          type="number"
                          min={priceSliderMinBound}
                          max={priceSliderMaxBound}
                          step={1000}
                          value={priceMin ?? ""}
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (!raw) {
                              setPriceMin(null);
                              return;
                            }
                            const parsed = Number(raw);
                            if (!Number.isFinite(parsed)) return;
                            const next = clampNumber(parsed, priceSliderMinBound, priceSliderMaxBound);
                            setPriceMin(next);
                            if (priceMax != null && next > priceMax) setPriceMax(next);
                          }}
                          placeholder="Sem mínimo"
                        />
                      </label>
                      <label>
                        Máximo
                        <input
                          type="number"
                          min={priceSliderMinBound}
                          max={priceSliderMaxBound}
                          step={1000}
                          value={priceMax ?? ""}
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (!raw) {
                              setPriceMax(null);
                              return;
                            }
                            const parsed = Number(raw);
                            if (!Number.isFinite(parsed)) return;
                            const next = clampNumber(parsed, priceSliderMinBound, priceSliderMaxBound);
                            setPriceMax(next);
                            if (priceMin != null && next < priceMin) setPriceMin(next);
                          }}
                          placeholder="Sem máximo"
                        />
                      </label>
                    </div>
                  </div>
                </details>

                <details className="catalog-filter-block">
                  <summary>Câmbio</summary>
                  <div className="catalog-checklist">
                    {transmissions.map(([slug, label]) => (
                      <label key={slug} className="catalog-check-item">
                        <input
                          type="checkbox"
                          checked={selectedTransmissions.includes(slug)}
                          onChange={() => setSelectedTransmissions((current) => toggleListValue(current, slug))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </details>

                <details className="catalog-filter-block">
                  <summary>Cor</summary>
                  <div className="catalog-checklist">
                    {colors.map(([slug, label]) => (
                      <label key={slug} className="catalog-check-item">
                        <input type="checkbox" checked={selectedColors.includes(slug)} onChange={() => setSelectedColors((current) => toggleListValue(current, slug))} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </details>

                <details className="catalog-filter-block">
                  <summary>Combustível</summary>
                  <div className="catalog-checklist">
                    {fuels.map(([slug, label]) => (
                      <label key={slug} className="catalog-check-item">
                        <input type="checkbox" checked={selectedFuels.includes(slug)} onChange={() => setSelectedFuels((current) => toggleListValue(current, slug))} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </details>

                <details className="catalog-filter-block">
                  <summary>Carroceria</summary>
                  <div className="catalog-checklist">
                    {bodies.map(([slug, label]) => (
                      <label key={slug} className="catalog-check-item">
                        <input type="checkbox" checked={selectedBodies.includes(slug)} onChange={() => setSelectedBodies((current) => toggleListValue(current, slug))} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </details>

                <label className="catalog-filter-search">
                  Busca rápida
                  <div>
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Modelo, versão, cidade..."
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyFilters();
                        }
                      }}
                    />
                    <button type="button" onClick={applyFilters} aria-label="Buscar veículos">
                      <Search size={16} />
                    </button>
                  </div>
                </label>

                <button type="button" className="catalog-apply-btn" onClick={applyFilters}>
                  Aplicar filtros
                </button>
              </article>
            </aside>
          )}

          <div className="catalog-results catalog-results--full">
            <header className="catalog-results-head catalog-results-head--full">
              <p>{isResultsLoading ? "Carregando veículos..." : `${resultVehicles.length} veículo(s) encontrados`}</p>
            </header>

            {isResultsLoading && (
              <div className="catalog-results-grid catalog-results-grid--full">
                {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <article className="offer-card skeleton" key={`catalog-skeleton-${index}`}>
                    <div className="skeleton-box image" />
                    <div className="skeleton-body">
                      <div className="skeleton-box title" />
                      <div className="skeleton-box subtitle" />
                      <div className="skeleton-box price" />
                      <div className="skeleton-box button" />
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!isResultsLoading && !visibleVehicles.length && (
              <article className="catalog-empty-state">
                <h3>Nenhum veículo encontrado</h3>
                <p>Ajuste os filtros para ampliar sua busca.</p>
              </article>
            )}

            {!isResultsLoading && Boolean(visibleVehicles.length) && (
              <>
                <div className="catalog-results-grid catalog-results-grid--full">
                  {visibleVehicles.map((vehicle, index) => (
                    <VehicleOfferCard
                      key={vehicle.id}
                      vehicleId={vehicle.id}
                      name={vehicle.name}
                      subtitle={vehicle.subtitle}
                      image={vehicle.image}
                      gallery={vehicle.gallery}
                      year={vehicle.year}
                      transmission={vehicle.transmission}
                      fuel={vehicle.fuel}
                      km={vehicle.km}
                      store={vehicle.store}
                      storeId={vehicle.storeId}
                      oldPrice={vehicle.oldPrice}
                      price={vehicle.price}
                      detailUrl={vehicle.url}
                      adUrl={vehicle.absoluteUrl}
                      qualityTag={vehicle.qualityTag}
                      secondaryHighlights={vehicle.secondaryHighlights}
                      delay={index * 0.01}
                      variant="grid"
                      molicar={vehicle.molicar}
                      plate={vehicle.plate}
                    />
                  ))}

                  {isLoadingMore &&
                    Array.from({ length: loadMoreSkeletonCount }).map((_, index) => (
                      <article className="offer-card skeleton" key={`catalog-load-more-skeleton-${index}`}>
                        <div className="skeleton-box image" />
                        <div className="skeleton-body">
                          <div className="skeleton-box title" />
                          <div className="skeleton-box subtitle" />
                          <div className="skeleton-box price" />
                          <div className="skeleton-box button" />
                        </div>
                      </article>
                    ))}
                </div>

                {hasMoreVehicles && (
                  <p ref={loadMoreRef} className="catalog-infinite-status">
                    {isLoadingMore ? "Carregando mais veículos..." : `Exibindo ${visibleVehicles.length} de ${resultVehicles.length} veículos`}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <SellYourCarCta />
    </>
  );
}

