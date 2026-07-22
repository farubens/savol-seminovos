"use client";

import { useEffect, useMemo } from "react";
import { MapPin, Navigation, PhoneCall, Store, X } from "lucide-react";
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
  const locationSource = normalize(`${store.name} ${store.address}`);

  if (brand === "volkswagen" && locationSource.includes("pereira-barreto")) {
    return "/images/stores/VOLKWAGEN-PEREIRA-BARRETO.jpeg";
  }

  if (brand === "toyota" && locationSource.includes("dom-pedro")) {
    return "/images/stores/TOYOTA DOM PEDRO.jpeg";
  }

  if ((brand === "mg" || brand === "mg-motor") && (locationSource.includes("goias-3048") || locationSource.includes("sao-caetano"))) {
    return "/images/stores/MG-MOTOR.jpeg";
  }

  if ((brand === "mg" || brand === "mg-motor") && locationSource.includes("analia-franco")) {
    return "/images/stores/falback-lojas.png";
  }

  const photoMap: Record<string, string> = {
    "citroen-santo-andre": "/images/stores/CITROEN SANTO ANDRE.jpeg",
    "citroen-sao-bernardo-do-campo": "/images/stores/citroen-sbc.jpeg",
    "citroen-sao-caetano-do-sul": "/images/stores/CITROEN SCS.jpeg",
    "fiat-santo-andre": "/images/stores/FIAT SANTO ANDRE.jpeg",
    "fiat-sao-bernardo-do-campo": "/images/stores/fiat-sbc.jpeg",
    "fiat-sao-caetano-do-sul": "/images/stores/FIAT SCS.jpeg",
    "jetour-santo-andre": "/images/stores/jetour-sta.png",
    "jetour-sao-caetano-do-sul": "/images/stores/jetour-scs.jpeg",
    "kia-santo-andre": "/images/stores/KIA-SANTO ANDRE.jpeg",
    "mg-sao-caetano-do-sul": "/images/stores/MG-MOTOR.jpeg",
    "mg-motor-sao-caetano-do-sul": "/images/stores/MG-MOTOR.jpeg",
    "peugeot-santo-andre": "/images/stores/PEUGEOT-SANTO-ANDRE.jpeg",
    "peugeot-sao-bernardo-do-campo": "/images/stores/peugeot-sbc.jpeg",
    "toyota-santo-andre": "/images/stores/TOYOTA SANTO ANDRE.jpeg",
    "toyota-sao-bernardo-do-campo": "/images/stores/toyota-sbc.jpeg",
    "toyota-maua": "/images/stores/toyota-maua.jpeg",
    "toyota-praia-grande": "/images/stores/toyota praia grande.jpeg",
    "toyota-sao-caetano-do-sul": "/images/stores/TOYOTA DOM PEDRO.jpeg",
    "volkswagen-santo-andre": "/images/stores/VOLKSWAGEN SANTO ANDRE.jpeg"
  };
  const cityKey = locationSource.includes("sao-bernardo")
    ? "sao-bernardo-do-campo"
    : locationSource.includes("praia-grande")
      ? "praia-grande"
    : locationSource.includes("maua")
      ? "maua"
    : locationSource.includes("sao-caetano")
      ? "sao-caetano-do-sul"
      : locationSource.includes("santo-andre")
        ? "santo-andre"
        : "santo-andre";
  const exactKey = `${brand}-${cityKey}`;
  if (photoMap[exactKey]) {
    return photoMap[exactKey];
  }
  return "/images/stores/falback-lojas.png";
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
              Loja SAVOL
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
        </div>
      </div>
    </div>
  );
}
