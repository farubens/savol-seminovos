"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List, Sparkles } from "lucide-react";
import { VehicleOfferCard } from "@/components/VehicleOfferCard";

type ApiVehicle = {
  id: number;
  name: string;
  subtitle: string;
  image: string;
  url: string;
  year: string;
  transmission: string;
  fuel: string;
  km: string;
  store: string;
  oldPrice: string;
  price: string;
  qualityTag: string;
};

type ApiResponse = {
  items?: ApiVehicle[];
};

const apiUrl = "/api/veiculos?per_page=8";

export function VehicleGrid() {
  const [vehicles, setVehicles] = useState<ApiVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    fetch(apiUrl, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((json: ApiResponse) => {
        const items = Array.isArray(json.items) ? json.items.slice(0, 8) : [];
        setVehicles(items);
      })
      .catch(() => setVehicles([]))
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return (
    <div className="offer-section">
      <div className="offer-toolbar">
        <p>Visualização:</p>
        <div className="offer-view-toggle" role="group" aria-label="Alternar visualização de cards">
          <button
            type="button"
            className={viewMode === "grid" ? "active" : ""}
            onClick={() => setViewMode("grid")}
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid size={16} /> Grid
          </button>
          <button
            type="button"
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
          >
            <List size={16} /> Lista
          </button>
        </div>
      </div>

      {loading && (
        <div className={viewMode === "grid" ? "offer-grid" : "offer-list"}>
          {Array.from({ length: viewMode === "grid" ? 8 : 3 }).map((_, index) => (
            <article className={`offer-card skeleton ${viewMode === "list" ? "offer-card--list" : ""}`} key={index}>
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

      {!loading && !vehicles.length && (
        <div className={viewMode === "grid" ? "offer-grid" : "offer-list"}>
          <article className="offer-card empty-state">
            <Sparkles size={20} />
            <h3>Sem estoque no momento</h3>
            <p>Tente novamente em instantes. A API pode estar indisponível.</p>
          </article>
        </div>
      )}

      {!loading && Boolean(vehicles.length) && (
        <div className={viewMode === "grid" ? "offer-grid" : "offer-list"}>
          {vehicles.map((vehicle, index) => (
            <VehicleOfferCard
              key={vehicle.id}
              name={vehicle.name}
              subtitle={vehicle.subtitle}
              image={vehicle.image}
              year={vehicle.year}
              transmission={vehicle.transmission}
              fuel={vehicle.fuel}
              km={vehicle.km}
              store={vehicle.store}
              oldPrice={vehicle.oldPrice}
              price={vehicle.price}
              detailUrl={vehicle.url}
              qualityTag={vehicle.qualityTag}
              delay={index * 0.06}
              variant={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}


