"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Fuel, Gauge, GitBranch, MapPin, ShieldCheck, UserRound } from "lucide-react";
import type { ApiVehicle } from "@/types/home";

type Props = {
  slug: string;
};

type VehicleApiResponse = {
  items?: ApiVehicle[];
};

type GalleryApiResponse = {
  gallery?: string[];
};

const FALLBACK_IMAGE = "/images/hero-car.png";

export function VehicleDetailsPageClient({ slug }: Props) {
  const [vehicle, setVehicle] = useState<ApiVehicle | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [gallery, setGallery] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    setLoadingVehicle(true);
    setVehicle(null);

    fetch(`/api/veiculos?slug=${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: VehicleApiResponse | null) => {
        const firstVehicle = payload?.items?.[0] ?? null;
        setVehicle(firstVehicle);
        if (firstVehicle) {
          setGallery(Array.from(new Set([firstVehicle.image, ...firstVehicle.gallery].filter(Boolean))));
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        setLoadingVehicle(false);
      });

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [slug]);

  useEffect(() => {
    if (!vehicle?.id) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 9000);
    setLoadingGallery(true);

    fetch(`/api/veiculos/${vehicle.id}/galeria`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: GalleryApiResponse | null) => {
        const remoteGallery = Array.isArray(payload?.gallery) ? payload.gallery.filter(Boolean) : [];
        if (remoteGallery.length) {
          setGallery(Array.from(new Set(remoteGallery)));
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        setLoadingGallery(false);
      });

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [vehicle?.id]);

  useEffect(() => {
    if (!gallery.length) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex > gallery.length - 1) {
      setSelectedIndex(0);
    }
  }, [gallery, selectedIndex]);

  const activeImage = useMemo(() => gallery[selectedIndex] ?? vehicle?.image ?? FALLBACK_IMAGE, [gallery, selectedIndex, vehicle?.image]);

  if (loadingVehicle) {
    return (
      <section className="container vehicle-details vehicle-details--loading">
        <p>Carregando veículo...</p>
      </section>
    );
  }

  if (!vehicle) {
    return (
      <section className="container vehicle-details vehicle-details--not-found">
        <h1>Veículo não encontrado</h1>
        <p>Este item não está mais disponível ou foi removido do estoque.</p>
        <Link href="/veiculos" className="btn">
          Voltar para veículos
        </Link>
      </section>
    );
  }

  return (
    <section className="container vehicle-details">
      <div className="vehicle-details-grid">
        <div className="vehicle-details-gallery">
          <div className="vehicle-details-main-image">
            <Image src={activeImage} alt={vehicle.name} width={980} height={620} />
          </div>

          <div className="vehicle-details-thumbs">
            {(gallery.length ? gallery : [vehicle.image || FALLBACK_IMAGE]).map((imageUrl, index) => (
              <button
                type="button"
                key={`${imageUrl}-${index}`}
                className={`vehicle-details-thumb${selectedIndex === index ? " is-active" : ""}`}
                onClick={() => setSelectedIndex(index)}
              >
                <Image src={imageUrl} alt={`${vehicle.name} - foto ${index + 1}`} width={164} height={110} />
              </button>
            ))}
          </div>
          {loadingGallery && <p className="vehicle-details-gallery-status">Carregando galeria completa...</p>}
        </div>

        <aside className="vehicle-details-content">
          <h1>{vehicle.name}</h1>
          <p className="vehicle-details-subtitle">{vehicle.subtitle}</p>

          <div className="vehicle-details-specs">
            <span>
              <CalendarDays size={16} /> {vehicle.year}
            </span>
            <span>
              <GitBranch size={16} /> {vehicle.transmission}
            </span>
            <span>
              <Fuel size={16} /> {vehicle.fuel}
            </span>
            <span>
              <Gauge size={16} /> {vehicle.km}
            </span>
          </div>

          <div className="vehicle-details-badges">
            <span>
              <ShieldCheck size={16} /> Garantia de fábrica
            </span>
            <span>
              <UserRound size={16} /> Único dono
            </span>
          </div>

          {vehicle.oldPrice ? <p className="vehicle-details-old-price">{vehicle.oldPrice}</p> : null}
          <p className="vehicle-details-price">
            Por <strong>{vehicle.price}</strong>
          </p>

          <p className="vehicle-details-store">
            <MapPin size={16} /> Loja: {vehicle.store}
          </p>

          <div className="vehicle-details-actions">
            <a href="#" className="btn">
              Simular parcelas
            </a>
            <a href="#" className="btn btn-outline">
              Falar com consultor
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}

