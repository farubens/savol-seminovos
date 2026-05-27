"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Navigation, Phone } from "lucide-react";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";
import { MapDirectionsModal } from "@/components/MapDirectionsModal";
import { StoreDetailsModal } from "@/components/StoreDetailsModal";
import type { ApiStore } from "@/types/home";

export function StoresCarousel() {
  const { stores, loading } = useHomeSessionData();
  const [storeModal, setStoreModal] = useState<ApiStore | null>(null);
  const [routeModalStore, setRouteModalStore] = useState<ApiStore | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({
    pointerId: -1,
    isDragging: false,
    startX: 0,
    startScrollLeft: 0
  });
  const visibleStores = useMemo(() => stores, [stores]);

  const scrollByStep = (direction: "left" | "right") => {
    const slider = sliderRef.current;
    if (!slider) return;
    const firstCard = slider.querySelector<HTMLElement>(".store-showcase-card");
    const step = firstCard ? firstCard.offsetWidth + 16 : Math.floor(slider.clientWidth * 0.8);
    slider.scrollBy({
      left: direction === "right" ? step : -step,
      behavior: "smooth"
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, iframe, input, select, textarea, [role='button']")) {
      return;
    }
    dragState.current.pointerId = event.pointerId;
    dragState.current.isDragging = true;
    dragState.current.startX = event.clientX;
    dragState.current.startScrollLeft = slider.scrollLeft;
    slider.classList.add("is-dragging");
    slider.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const slider = sliderRef.current;
    if (!slider || !dragState.current.isDragging) return;
    const delta = event.clientX - dragState.current.startX;
    slider.scrollLeft = dragState.current.startScrollLeft - delta;
  };

  const onPointerUpOrCancel = (event: PointerEvent<HTMLDivElement>) => {
    const slider = sliderRef.current;
    if (!slider || dragState.current.pointerId !== event.pointerId) return;
    dragState.current.isDragging = false;
    dragState.current.pointerId = -1;
    slider.classList.remove("is-dragging");
    if (slider.hasPointerCapture(event.pointerId)) {
      slider.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section className="container stores-showcase">
      <div className="section-title-row">
        <h2>Nossas lojas</h2>
        <Link href="/lojas">Ver todas as lojas</Link>
      </div>

      <div className="store-showcase-wrap">
        <div className="store-showcase-nav">
          <button
            type="button"
            className="store-nav-btn store-nav-btn--prev"
            aria-label="Deslizar para a esquerda"
            onClick={() => scrollByStep("left")}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="store-nav-btn store-nav-btn--next"
            aria-label="Deslizar para a direita"
            onClick={() => scrollByStep("right")}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div
          className="store-showcase-slider"
          ref={sliderRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUpOrCancel}
          onPointerCancel={onPointerUpOrCancel}
        >
          {loading &&
            Array.from({ length: 2 }).map((_, index) => (
              <article className="store-showcase-card store-showcase-card--loading" key={`store-skeleton-${index}`}>
                <div className="store-skeleton-line short" />
                <div className="store-skeleton-line title" />
                <div className="store-skeleton-line medium" />
                <div className="store-skeleton-line medium" />
                <div className="store-skeleton-line actions" />
              </article>
            ))}

          {!loading && !visibleStores.length && (
            <article className="store-showcase-card store-showcase-empty">
              <h3>Sem lojas para exibir</h3>
              <p>Não foi possível carregar as unidades da API no momento.</p>
            </article>
          )}

          {!loading &&
            visibleStores.map((store) => (
              <article className="store-showcase-card" key={store.id}>
                <div className="store-showcase-content">
                  <p className="store-brand">{store.brand}</p>
                  <h3>{store.name}</h3>

                  <div className="store-detail">
                    <MapPin size={18} />
                    <p>{store.address}</p>
                  </div>

                  <div className="store-detail">
                    <Phone size={18} />
                    <p>{store.phone}</p>
                  </div>

                  <p className="store-count">{store.vehiclesCount} veículos</p>

                  <div className="store-actions">
                    <button type="button" className="store-btn-primary" onClick={() => setStoreModal(store)}>
                      Ver loja <ArrowRight size={16} />
                    </button>
                    <button type="button" className="store-btn-ghost" onClick={() => setRouteModalStore(store)}>
                      <Navigation size={15} /> Como chegar
                    </button>
                  </div>
                </div>

                <div className="store-showcase-map">
                  <iframe
                    className="store-map-embed"
                    title={`Mapa da loja ${store.name}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(store.address || store.name)}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </article>
            ))}
        </div>
      </div>

      <MapDirectionsModal
        open={Boolean(routeModalStore)}
        storeName={routeModalStore?.name ?? ""}
        address={routeModalStore?.address ?? ""}
        onClose={() => setRouteModalStore(null)}
      />

      <StoreDetailsModal
        open={Boolean(storeModal)}
        store={storeModal}
        onClose={() => setStoreModal(null)}
        onOpenDirections={(store) => {
          setStoreModal(null);
          setRouteModalStore(store);
        }}
      />
    </section>
  );
}
