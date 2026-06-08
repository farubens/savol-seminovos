"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, Sparkles } from "lucide-react";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";
import { VehicleOfferCard } from "@/components/VehicleOfferCard";

export function VehicleGrid() {
  const { vehicles, loading } = useHomeSessionData();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const featuredVehicles = useMemo(() => vehicles.slice(0, 8), [vehicles]);

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

      {!loading && !featuredVehicles.length && (
        <div className={viewMode === "grid" ? "offer-grid" : "offer-list"}>
          <article className="offer-card empty-state">
            <Sparkles size={20} />
            <h3>Sem estoque no momento</h3>
            <p>Tente novamente em instantes. A API pode estar indisponível.</p>
          </article>
        </div>
      )}

      {!loading && Boolean(featuredVehicles.length) && (
        <div className={viewMode === "grid" ? "offer-grid" : "offer-list"}>
          {featuredVehicles.map((vehicle, index) => (
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
              secondaryHighlights={vehicle.secondaryHighlights}
              delay={index * 0.06}
              variant={viewMode}
              molicar={vehicle.molicar}
              plate={vehicle.plate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

