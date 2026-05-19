"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";
import { VehicleOfferCard } from "@/components/VehicleOfferCard";

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

function formatPriceValue(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
}

export function VehicleCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { vehicles, loading } = useHomeSessionData();

  const urlBrand = searchParams.get("brand") ?? "all";
  const urlModel = searchParams.get("model") ?? "all";
  const urlMaxPrice = searchParams.get("maxPrice") ?? "all";
  const urlQuery = searchParams.get("q") ?? "";

  const [brand, setBrand] = useState(urlBrand);
  const [model, setModel] = useState(urlModel);
  const [maxPrice, setMaxPrice] = useState(urlMaxPrice);
  const [query, setQuery] = useState(urlQuery);

  const brands = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      const label = vehicle.brand.trim();
      if (!label) continue;
      map.set(toSlug(label), label);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [vehicles]);

  const models = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      if (brand !== "all" && toSlug(vehicle.brand) !== brand) continue;
      const label = vehicle.model.trim();
      if (!label) continue;
      map.set(toSlug(label), label);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [brand, vehicles]);

  const priceOptions = useMemo(() => {
    const values = vehicles
      .map((vehicle) => parsePriceValue(vehicle.price))
      .filter((value): value is number => typeof value === "number")
      .sort((a, b) => a - b);
    return Array.from(new Set(values));
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const queryTokens = normalize(query)
      .split(/\s+/)
      .filter(Boolean);
    const maxPriceValue = maxPrice !== "all" ? Number(maxPrice) : null;

    return vehicles.filter((vehicle) => {
      if (brand !== "all" && toSlug(vehicle.brand) !== brand) return false;
      if (model !== "all" && toSlug(vehicle.model) !== model) return false;

      if (typeof maxPriceValue === "number" && Number.isFinite(maxPriceValue)) {
        const vehiclePrice = parsePriceValue(vehicle.price);
        if (vehiclePrice == null || vehiclePrice > maxPriceValue) return false;
      }

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
  }, [vehicles, brand, model, maxPrice, query]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (brand !== "all") params.set("brand", brand);
    if (brand !== "all" && model !== "all") params.set("model", model);
    if (maxPrice !== "all") params.set("maxPrice", maxPrice);
    if (query.trim()) params.set("q", query.trim());
    router.push(`/veiculos${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <section className="container catalog-page">
      <header className="catalog-page-head">
        <h1>Catálogo de veículos</h1>
        <p>{loading ? "Carregando..." : `${filteredVehicles.length} veículo(s) encontrado(s)`}</p>
      </header>

      <div className="catalog-filters">
        <label>
          Marca
          <select value={brand} onChange={(event) => setBrand(event.target.value)}>
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

        <label>
          Preço máximo
          <select value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}>
            <option value="all">Sem limite</option>
            {priceOptions.map((value) => (
              <option key={value} value={String(value)}>
                {formatPriceValue(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="catalog-filter-search">
          Buscar com IA
          <div>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: SUV automático até R$ 120.000"
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
      </div>

      <div className="offer-grid">
        {!loading &&
          filteredVehicles.map((vehicle, index) => (
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
    </section>
  );
}
