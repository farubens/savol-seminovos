"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Sparkles } from "lucide-react";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";
import { VehicleOfferCard } from "@/components/VehicleOfferCard";

export function VehicleGrid() {
  const { vehicles, loading } = useHomeSessionData();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isMobileView, setIsMobileView] = useState(false);
  const featuredVehicles = useMemo(() => vehicles.slice(0, 8), [vehicles]);
  const effectiveViewMode = isMobileView ? "grid" : viewMode;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const updateViewMode = () => setIsMobileView(mediaQuery.matches);

    updateViewMode();
    mediaQuery.addEventListener("change", updateViewMode);

    return () => mediaQuery.removeEventListener("change", updateViewMode);
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
        <div className={effectiveViewMode === "grid" ? "offer-grid" : "offer-list"}>
          {Array.from({ length: effectiveViewMode === "grid" ? 8 : 3 }).map((_, index) => (
            <article className={`offer-card skeleton ${effectiveViewMode === "list" ? "offer-card--list" : ""}`} key={index}>
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
        <div className={effectiveViewMode === "grid" ? "offer-grid" : "offer-list"}>
          <article className="offer-card empty-state">
            <Sparkles size={20} />
            <h3>Sem estoque no momento</h3>
            <p>Tente novamente em instantes. A API pode estar indisponível.</p>
          </article>
        </div>
      )}

      {!loading && Boolean(featuredVehicles.length) && (
        <div className={effectiveViewMode === "grid" ? "offer-grid" : "offer-list"}>
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
              storeId={vehicle.storeId}
              oldPrice={vehicle.oldPrice}
              price={vehicle.price}
              detailUrl={vehicle.url}
              adUrl={vehicle.absoluteUrl}
              qualityTag={vehicle.qualityTag}
              secondaryHighlights={vehicle.secondaryHighlights}
              delay={index * 0.06}
              variant={effectiveViewMode}
              molicar={vehicle.molicar}
              plate={vehicle.plate}
              armored={vehicle.armored}
              negotiating={vehicle.negotiating}
            />
          ))}
        </div>
      )}
    </div>
  );
}

