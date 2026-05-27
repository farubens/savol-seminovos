"use client";

import { useEffect, useMemo } from "react";
import { ExternalLink, MapPin, Navigation, PhoneCall, Store, X } from "lucide-react";
import type { ApiStore } from "@/types/home";

type StoreDetailsModalProps = {
  open: boolean;
  store: ApiStore | null;
  onClose: () => void;
  onOpenDirections: (store: ApiStore) => void;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFacadeImage(store: ApiStore): string {
  const brand = normalize(store.brand || "savol");
  const city = normalize(store.address || "santo-andre");
  const photoMap: Record<string, string> = {
    "citroen-sao-caetano-do-sul": "/images/stores/citroen-scs.jpeg",
    "fiat-sao-caetano-do-sul": "/images/stores/fiat-scs.jpeg",
    "jetour-sao-caetano-do-sul": "/images/stores/jetour-scs.jpeg",
    "mg-motor-sao-caetano-do-sul": "/images/stores/mg-scs.jpeg",
    "mg-sao-caetano-do-sul": "/images/stores/mg-scs.jpeg",
    "peugeot-sao-caetano-do-sul": "/images/stores/peugeot-scs.jpeg",
    "toyota-sao-caetano-do-sul": "/images/stores/toyota-scs.jpeg"
  };
  const cityKey = city.includes("sao-caetano") ? "sao-caetano-do-sul" : city;
  const exactKey = `${brand}-${cityKey}`;
  if (photoMap[exactKey]) {
    return photoMap[exactKey];
  }
  return `https://images.unsplash.com/photo-1562141961-b5d3950d7cfb?auto=format&fit=crop&w=1200&q=80&sat=-10&blend=${encodeURIComponent(
    `000000`
  )}&blend-alpha=2&${brand}-${city}-${store.id}`;
}

export function StoreDetailsModal({ open, store, onClose, onOpenDirections }: StoreDetailsModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const mapEmbedUrl = useMemo(() => {
    if (!store) return "";
    return `https://www.google.com/maps?q=${encodeURIComponent(store.address || store.name)}&output=embed`;
  }, [store]);

  if (!open || !store) return null;

  return (
    <div className="store-details-modal-backdrop" onClick={onClose}>
      <div className="store-details-modal" role="dialog" aria-modal="true" aria-label={`Detalhes da loja ${store.name}`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="store-details-modal-close" aria-label="Fechar modal da loja" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="store-details-modal-head">
          <p className="store-details-kicker">{store.brand}</p>
          <h3>{store.name}</h3>
        </div>

        <div className="store-details-media-grid">
          <article className="store-details-facade">
            <img src={getFacadeImage(store)} alt={`Fachada da loja ${store.name}`} loading="lazy" />
            <span className="store-details-facade-badge">
              <Store size={14} />
              Loja Savol
            </span>
          </article>

          <article className="store-details-map-box">
            <iframe
              className="store-details-map"
              title={`Mapa da loja ${store.name}`}
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </article>
        </div>

        <div className="store-details-contact-grid">
          <p>
            <MapPin size={16} /> {store.address}
          </p>
          <p>
            <PhoneCall size={16} /> {store.phone}
          </p>
        </div>

        <div className="store-details-actions">
          <button type="button" className="store-btn-primary" onClick={() => onOpenDirections(store)}>
            <Navigation size={15} />
            Como chegar
          </button>
          <a className="store-btn-ghost" href={store.storeUrl} target="_blank" rel="noopener noreferrer">
            Ver página da loja
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
