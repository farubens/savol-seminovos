"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Fuel, Gauge, GitBranch, MapPin, ShieldCheck, UserRound, X } from "lucide-react";
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
  const [slideDirection, setSlideDirection] = useState(1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const thumbsRef = useRef<HTMLDivElement | null>(null);

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
  const galleryItems = useMemo(() => (gallery.length ? gallery : [vehicle?.image || FALLBACK_IMAGE]), [gallery, vehicle?.image]);

  const goToImage = (index: number) => {
    if (!galleryItems.length) return;
    const nextIndex = (index + galleryItems.length) % galleryItems.length;
    if (nextIndex === selectedIndex) return;
    setSlideDirection(nextIndex > selectedIndex ? 1 : -1);
    setSelectedIndex(nextIndex);
  };

  const goToPrevImage = () => {
    setSlideDirection(-1);
    setSelectedIndex((current) => (current - 1 + galleryItems.length) % galleryItems.length);
  };

  const goToNextImage = () => {
    setSlideDirection(1);
    setSelectedIndex((current) => (current + 1) % galleryItems.length);
  };

  const scrollThumbs = (direction: "left" | "right") => {
    const thumbs = thumbsRef.current;
    if (!thumbs) return;
    thumbs.scrollBy({ left: direction === "right" ? 260 : -260, behavior: "smooth" });
  };

  useEffect(() => {
    if (!isLightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLightboxOpen(false);
      if (event.key === "ArrowLeft") goToPrevImage();
      if (event.key === "ArrowRight") goToNextImage();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isLightboxOpen, galleryItems.length]);

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
            <div className="vehicle-details-main-image-nav">
              <button type="button" className="vehicle-details-main-nav-btn" aria-label="Foto anterior" onClick={goToPrevImage}>
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="vehicle-details-main-nav-btn" aria-label="Próxima foto" onClick={goToNextImage}>
                <ChevronRight size={18} />
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${activeImage}-${selectedIndex}`}
                className="vehicle-details-main-image-motion"
                custom={slideDirection}
                initial={{ opacity: 0, x: slideDirection > 0 ? 30 : -30, scale: 1.035, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: slideDirection > 0 ? -24 : 24, scale: 0.985, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <button type="button" className="vehicle-details-main-image-hit" onClick={() => setIsLightboxOpen(true)} aria-label="Ampliar imagem">
                  <Image src={activeImage} alt={vehicle.name} width={980} height={620} />
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="vehicle-details-thumbs-shell">
            <button type="button" className="vehicle-details-thumbs-nav vehicle-details-thumbs-nav--left" aria-label="Miniaturas anteriores" onClick={() => scrollThumbs("left")}>
              <ChevronLeft size={18} />
            </button>

            <div className="vehicle-details-thumbs" ref={thumbsRef}>
              {galleryItems.map((imageUrl, index) => (
                <button type="button" key={`${imageUrl}-${index}`} className={`vehicle-details-thumb${selectedIndex === index ? " is-active" : ""}`} onClick={() => goToImage(index)}>
                  <Image src={imageUrl} alt={`${vehicle.name} - foto ${index + 1}`} width={164} height={110} />
                </button>
              ))}
            </div>

            <button type="button" className="vehicle-details-thumbs-nav vehicle-details-thumbs-nav--right" aria-label="Próximas miniaturas" onClick={() => scrollThumbs("right")}>
              <ChevronRight size={18} />
            </button>
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
            <button type="button" className="btn">
              Simular parcelas
            </button>
            <button type="button" className="btn btn-outline">
              Falar com consultor
            </button>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div className="vehicle-lightbox-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLightboxOpen(false)}>
            <motion.div
              className="vehicle-lightbox-dialog"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="vehicle-lightbox-close" onClick={() => setIsLightboxOpen(false)} aria-label="Fechar lightbox">
                <X size={20} />
              </button>
              <button type="button" className="vehicle-lightbox-nav vehicle-lightbox-nav--left" onClick={goToPrevImage} aria-label="Foto anterior">
                <ChevronLeft size={24} />
              </button>
              <div className="vehicle-lightbox-media">
                <Image src={activeImage} alt={vehicle.name} width={1440} height={920} />
              </div>
              <button type="button" className="vehicle-lightbox-nav vehicle-lightbox-nav--right" onClick={goToNextImage} aria-label="Próxima foto">
                <ChevronRight size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
