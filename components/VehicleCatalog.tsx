"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";
import { SellYourCarCta } from "@/components/SellYourCarCta";
import { VehicleOfferCard } from "@/components/VehicleOfferCard";

const DEFAULT_SORT = "destaques";
const PAGE_SIZE = 9;

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
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0) return null;
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

function buildQueryString(options: {
  brand: string;
  model: string;
  store: string;
  priceMin: number | null;
  priceMax: number | null;
  kmMin: number | null;
  kmMax: number | null;
  query: string;
  sort: string;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (options.brand !== "all") params.set("brand", options.brand);
  if (options.model !== "all") params.set("model", options.model);
  if (options.store !== "all") params.set("store", options.store);
  if (options.priceMin != null) params.set("priceMin", String(options.priceMin));
  if (options.priceMax != null) params.set("priceMax", String(options.priceMax));
  if (options.kmMin != null) params.set("kmMin", String(options.kmMin));
  if (options.kmMax != null) params.set("kmMax", String(options.kmMax));
  if (options.query.trim()) params.set("q", options.query.trim());
  if (options.sort !== DEFAULT_SORT) params.set("sort", options.sort);
  if (options.page > 1) params.set("page", String(options.page));
  return params.toString();
}

function getPaginationPages(currentPage: number, totalPages: number): Array<number | "dots"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "dots"> = [1];
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd = Math.min(totalPages - 1, currentPage + 1);

  if (windowStart > 2) pages.push("dots");

  for (let page = windowStart; page <= windowEnd; page += 1) {
    pages.push(page);
  }

  if (windowEnd < totalPages - 1) pages.push("dots");

  pages.push(totalPages);
  return pages;
}

export function VehicleCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { vehicles, loading } = useHomeSessionData();
  const [isHydrated, setIsHydrated] = useState(false);

  const urlBrand = searchParams.get("brand") ?? "all";
  const urlModel = searchParams.get("model") ?? "all";
  const urlStore = searchParams.get("store") ?? "all";
  const legacyMaxPrice = parseBoundParam(searchParams.get("maxPrice"));
  const urlPriceMin = parseBoundParam(searchParams.get("priceMin"));
  const urlPriceMax = parseBoundParam(searchParams.get("priceMax")) ?? legacyMaxPrice;
  const urlKmMin = parseBoundParam(searchParams.get("kmMin"));
  const urlKmMax = parseBoundParam(searchParams.get("kmMax"));
  const urlQuery = searchParams.get("q") ?? "";
  const urlSort = searchParams.get("sort") ?? DEFAULT_SORT;
  const urlPage = Number(searchParams.get("page") ?? "1");

  const [brand, setBrand] = useState(urlBrand);
  const [model, setModel] = useState(urlModel);
  const [store, setStore] = useState(urlStore);
  const [priceMin, setPriceMin] = useState<number | null>(urlPriceMin);
  const [priceMax, setPriceMax] = useState<number | null>(urlPriceMax);
  const [kmMin, setKmMin] = useState<number | null>(urlKmMin);
  const [kmMax, setKmMax] = useState<number | null>(urlKmMax);
  const [query, setQuery] = useState(urlQuery);
  const [sort, setSort] = useState(urlSort);
  const [page, setPage] = useState(Number.isFinite(urlPage) && urlPage > 0 ? urlPage : 1);

  useEffect(() => {
    setBrand(urlBrand);
    setModel(urlModel);
    setStore(urlStore);
    setPriceMin(urlPriceMin);
    setPriceMax(urlPriceMax);
    setKmMin(urlKmMin);
    setKmMax(urlKmMax);
    setQuery(urlQuery);
    setSort(urlSort);
    setPage(Number.isFinite(urlPage) && urlPage > 0 ? urlPage : 1);
  }, [urlBrand, urlModel, urlStore, urlPriceMin, urlPriceMax, urlKmMin, urlKmMax, urlQuery, urlSort, urlPage]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const brands = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      const label = vehicle.brand.trim();
      if (!label) continue;
      map.set(toSlug(label), label);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [vehicles]);

  const stores = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      const label = vehicle.store.trim();
      if (!label) continue;
      map.set(toSlug(label), label);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [vehicles]);

  const models = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      if (brand !== "all" && toSlug(vehicle.brand) !== brand) continue;
      const label = vehicle.model.trim();
      if (!label) continue;
      map.set(toSlug(label), label);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [brand, vehicles]);

  const priceBounds = useMemo(() => {
    const values = vehicles.map((vehicle) => parsePriceValue(vehicle.price)).filter((value): value is number => value != null);
    if (!values.length) return { min: 0, max: 0 };
    let min = values[0];
    let max = values[0];
    for (const value of values) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return { min, max };
  }, [vehicles]);

  const kmBounds = useMemo(() => {
    const values = vehicles.map((vehicle) => parseKmValue(vehicle.km)).filter((value): value is number => value != null);
    if (!values.length) return { min: 0, max: 0 };
    let min = values[0];
    let max = values[0];
    for (const value of values) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return { min, max };
  }, [vehicles]);

  const priceSliderMinBound = priceBounds.min;
  const priceSliderMaxBound = priceBounds.max > priceBounds.min ? priceBounds.max : priceBounds.min + 1;
  const kmSliderMinBound = kmBounds.min;
  const kmSliderMaxBound = kmBounds.max > kmBounds.min ? kmBounds.max : kmBounds.min + 1;

  const normalizedPriceRange = normalizeOptionalRange(priceMin, priceMax, priceSliderMinBound, priceSliderMaxBound);
  const normalizedKmRange = normalizeOptionalRange(kmMin, kmMax, kmSliderMinBound, kmSliderMaxBound);

  const displayPriceMin = normalizedPriceRange.min ?? priceSliderMinBound;
  const displayPriceMax = normalizedPriceRange.max ?? priceSliderMaxBound;
  const displayKmMin = normalizedKmRange.min ?? kmSliderMinBound;
  const displayKmMax = normalizedKmRange.max ?? kmSliderMaxBound;

  const sliderPriceMin = Math.min(displayPriceMin, displayPriceMax);
  const sliderPriceMax = Math.max(displayPriceMin, displayPriceMax);
  const sliderKmMin = Math.min(displayKmMin, displayKmMax);
  const sliderKmMax = Math.max(displayKmMin, displayKmMax);

  const priceLeftPercent = toPercent(sliderPriceMin, priceSliderMinBound, priceSliderMaxBound);
  const priceRightPercent = toPercent(sliderPriceMax, priceSliderMinBound, priceSliderMaxBound);
  const kmLeftPercent = toPercent(sliderKmMin, kmSliderMinBound, kmSliderMaxBound);
  const kmRightPercent = toPercent(sliderKmMax, kmSliderMinBound, kmSliderMaxBound);

  const filteredVehicles = useMemo(() => {
    const queryTokens = normalize(query)
      .split(/\s+/)
      .filter(Boolean);

    return vehicles.filter((vehicle) => {
      if (brand !== "all" && toSlug(vehicle.brand) !== brand) return false;
      if (model !== "all" && toSlug(vehicle.model) !== model) return false;
      if (store !== "all" && toSlug(vehicle.store) !== store) return false;

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
            vehicle.store
          ].join(" ")
        );

        const matchesAll = queryTokens.every((token) => searchable.includes(token));
        if (!matchesAll) return false;
      }

      return true;
    });
  }, [vehicles, brand, model, store, query, normalizedPriceRange.min, normalizedPriceRange.max, normalizedKmRange.min, normalizedKmRange.max]);

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

  const totalPages = Math.max(1, Math.ceil(sortedVehicles.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const pageVehicles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedVehicles.slice(start, start + PAGE_SIZE);
  }, [sortedVehicles, currentPage]);

  const paginationItems = useMemo(() => getPaginationPages(currentPage, totalPages), [currentPage, totalPages]);

  const pushQuery = (nextPage: number, nextSort = sort) => {
    const priceRange = normalizeOptionalRange(priceMin, priceMax, priceSliderMinBound, priceSliderMaxBound);
    const kmRange = normalizeOptionalRange(kmMin, kmMax, kmSliderMinBound, kmSliderMaxBound);

    setPriceMin(priceRange.min);
    setPriceMax(priceRange.max);
    setKmMin(kmRange.min);
    setKmMax(kmRange.max);

    const queryString = buildQueryString({
      brand,
      model,
      store,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      kmMin: kmRange.min,
      kmMax: kmRange.max,
      query,
      sort: nextSort,
      page: nextPage
    });

    router.push(`/veiculos${queryString ? `?${queryString}` : ""}`);
  };

  const applyFilters = () => {
    pushQuery(1);
  };

  const clearFilters = () => {
    setBrand("all");
    setModel("all");
    setStore("all");
    setPriceMin(null);
    setPriceMax(null);
    setKmMin(null);
    setKmMax(null);
    setQuery("");
    setSort(DEFAULT_SORT);
    setPage(1);
    router.push("/veiculos");
  };

  if (!isHydrated) {
    return (
      <>
        <section className="catalog-hero">
          <div className="container catalog-hero-inner">
            <h1>Veículos</h1>
            <p>Encontre o carro ideal para você</p>
          </div>
        </section>
        <section className="container catalog-shell">
          <p className="catalog-breadcrumb">Home &gt; Veículos</p>
        </section>
        <SellYourCarCta />
      </>
    );
  }

  return (
    <>
      <section className="catalog-hero">
        <div className="container catalog-hero-inner">
          <h1>Veículos</h1>
          <p>Encontre o carro ideal para você</p>
        </div>
      </section>

      <section className="container catalog-shell">
        <div className="catalog-top-row">
          <p className="catalog-breadcrumb">Home &gt; Veículos</p>

          <label className="catalog-sort">
            Ordenar por
            <select
              value={sort}
              onChange={(event) => {
                const nextSort = event.target.value;
                setSort(nextSort);
                pushQuery(1, nextSort);
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

        <div className="catalog-layout-grid">
          <aside className="catalog-sidebar" aria-label="Filtros de veículos">
            <article className="catalog-filter-card">
              <header className="catalog-filter-head">
                <h2>
                  <SlidersHorizontal size={18} /> Filtros
                </h2>
                <button type="button" onClick={clearFilters}>
                  Limpar filtros
                </button>
              </header>

              <label>
                Loja
                <select value={store} onChange={(event) => setStore(event.target.value)}>
                  <option value="all">Todas</option>
                  {stores.map(([slug, label]) => (
                    <option key={slug} value={slug}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Marca
                <select
                  value={brand}
                  onChange={(event) => {
                    const nextBrand = event.target.value;
                    setBrand(nextBrand);
                    setModel("all");
                  }}
                >
                  <option value="all">Todas</option>
                  {brands.map(([slug, label]) => (
                    <option key={slug} value={slug}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Modelo
                <select value={model} onChange={(event) => setModel(event.target.value)} disabled={brand === "all"}>
                  <option value="all">Todos</option>
                  {models.map(([slug, label]) => (
                    <option key={slug} value={slug}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="catalog-range-group">
                <p className="catalog-range-title">Faixa de preço</p>
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
                        if (priceMax != null && next > priceMax) {
                          setPriceMax(next);
                        }
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
                        if (priceMin != null && next < priceMin) {
                          setPriceMin(next);
                        }
                      }}
                      placeholder="Sem máximo"
                    />
                  </label>
                </div>
              </div>

              <div className="catalog-range-group">
                <p className="catalog-range-title">Faixa de quilometragem</p>
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
                        if (kmMax != null && next > kmMax) {
                          setKmMax(next);
                        }
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
                        if (kmMin != null && next < kmMin) {
                          setKmMin(next);
                        }
                      }}
                      placeholder="Sem máximo"
                    />
                  </label>
                </div>
              </div>

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

          <div className="catalog-results">
            <header className="catalog-results-head">
              <p>{loading ? "Carregando veículos..." : `${sortedVehicles.length} veículo(s) encontrado(s)`}</p>
            </header>

            {loading && (
              <div className="catalog-results-grid">
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

            {!loading && !pageVehicles.length && (
              <article className="catalog-empty-state">
                <h3>Nenhum veículo encontrado</h3>
                <p>Ajuste os filtros para ampliar sua busca.</p>
              </article>
            )}

            {!loading && Boolean(pageVehicles.length) && (
              <>
                <div className="catalog-results-grid">
                  {pageVehicles.map((vehicle, index) => (
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
                      oldPrice={vehicle.oldPrice}
                      price={vehicle.price}
                      detailUrl={vehicle.url}
                      qualityTag={vehicle.qualityTag}
                      delay={index * 0.03}
                      variant="grid"
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="catalog-pagination" aria-label="Paginação da listagem de veículos">
                    <button type="button" onClick={() => pushQuery(Math.max(1, currentPage - 1))} disabled={currentPage === 1} aria-label="Página anterior">
                      <ChevronLeft size={16} />
                    </button>

                    {paginationItems.map((item, index) =>
                      item === "dots" ? (
                        <span key={`dots-${index}`} className="catalog-pagination-dots">
                          ...
                        </span>
                      ) : (
                        <button key={item} type="button" className={item === currentPage ? "is-active" : ""} onClick={() => pushQuery(item)}>
                          {item}
                        </button>
                      )
                    )}

                    <button type="button" onClick={() => pushQuery(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} aria-label="Próxima página">
                      <ChevronRight size={16} />
                    </button>
                  </nav>
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
