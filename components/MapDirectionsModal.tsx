"use client";

import { useEffect } from "react";
import { ExternalLink, Navigation, X } from "lucide-react";

type MapDirectionsModalProps = {
  open: boolean;
  storeName: string;
  address: string;
  onClose: () => void;
};

function buildEncodedQuery(storeName: string, address: string): string {
  const source = `${address || ""} ${storeName || ""}`.trim();
  return encodeURIComponent(source || "Grupo SAVOL");
}

export function MapDirectionsModal({ open, storeName, address, onClose }: MapDirectionsModalProps) {
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

  if (!open) return null;

  const query = buildEncodedQuery(storeName, address);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const wazeUrl = `https://www.waze.com/ul?q=${query}&navigate=yes`;
  const appleMapsUrl = `https://maps.apple.com/?q=${query}`;

  return (
    <div className="directions-modal-backdrop" onClick={onClose}>
      <div className="directions-modal" role="dialog" aria-modal="true" aria-label={`Opções de rota para ${storeName || "SAVOL"}`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="directions-modal-close" aria-label="Fechar modal de rotas" onClick={onClose}>
          <X size={18} />
        </button>

        <p className="directions-modal-kicker">Como chegar</p>
        <h3>Vá até a SAVOL mais próxima de você</h3>
        {storeName ? <p className="directions-modal-store">{storeName}</p> : null}
        {address ? <p className="directions-modal-address">{address}</p> : null}

        <div className="directions-modal-actions">
          <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="directions-modal-app is-waze">
            <Navigation size={16} />
            Abrir no Waze
            <ExternalLink size={14} />
          </a>

          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="directions-modal-app is-google">
            <Navigation size={16} />
            Abrir no Google Maps
            <ExternalLink size={14} />
          </a>

          <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" className="directions-modal-app is-apple">
            <Navigation size={16} />
            Abrir no Apple Maps
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
