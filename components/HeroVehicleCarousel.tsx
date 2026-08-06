"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";
import type { ApiVehicle } from "@/types/home";

const AUTOPLAY_DELAY_MS = 5500;

function isRepasseVehicle(vehicle: { repasse: boolean; qualityTag: string; secondaryHighlights: string[] }): boolean {
  const repasseValue = String(vehicle.repasse).trim().toLowerCase();
  if (repasseValue === "true" || repasseValue === "1") return true;

  const highlights = [vehicle.qualityTag, ...vehicle.secondaryHighlights].join(" ").toLowerCase();
  return highlights.includes("repasse");
}

function getVehicleUrl(url: string, slug: string): string {
  if (url.startsWith("/")) return url;
  return `/veiculos/${slug}`;
}

function shuffleVehicles(vehicles: ApiVehicle[]): ApiVehicle[] {
  const shuffled = [...vehicles];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function getCircularOffset(index: number, activeIndex: number, length: number): number {
  let offset = index - activeIndex;
  const halfway = Math.floor(length / 2);

  if (offset > halfway) offset -= length;
  if (offset < -halfway) offset += length;

  return offset;
}

export function HeroVehicleCarousel() {
  const { vehicles, loading } = useHomeSessionData();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [motionDirection, setMotionDirection] = useState<"next" | "prev">("next");

  const featuredVehicles = useMemo(
    () => {
      const eligibleVehicles = vehicles.filter(
        (vehicle) => !isRepasseVehicle(vehicle) && !vehicle.preparing && vehicle.photoCount > 1 && vehicle.image && vehicle.price
      );
      return shuffleVehicles(eligibleVehicles).slice(0, 5);
    },
    [vehicles]
  );

  useEffect(() => {
    if (activeIndex < featuredVehicles.length) return;
    setActiveIndex(0);
  }, [activeIndex, featuredVehicles.length]);

  useEffect(() => {
    if (isPaused || featuredVehicles.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setMotionDirection("next");
      setActiveIndex((current) => (current + 1) % featuredVehicles.length);
    }, AUTOPLAY_DELAY_MS);

    return () => window.clearInterval(intervalId);
  }, [featuredVehicles.length, isPaused]);

  const goToPrevious = () => {
    if (!featuredVehicles.length) return;
    setMotionDirection("prev");
    setActiveIndex((current) => (current - 1 + featuredVehicles.length) % featuredVehicles.length);
  };

  const goToNext = () => {
    if (!featuredVehicles.length) return;
    setMotionDirection("next");
    setActiveIndex((current) => (current + 1) % featuredVehicles.length);
  };

  const goToIndex = (index: number) => {
    if (index === activeIndex || !featuredVehicles.length) return;
    const forwardDistance = (index - activeIndex + featuredVehicles.length) % featuredVehicles.length;
    const backwardDistance = (activeIndex - index + featuredVehicles.length) % featuredVehicles.length;
    setMotionDirection(forwardDistance <= backwardDistance ? "next" : "prev");
    setActiveIndex(index);
  };

  if (loading) {
    return (
      <div className="hero-vehicle-carousel hero-vehicle-carousel--loading" aria-label="Carregando veículos em destaque">
        <div className="hero-vehicle-card-skeleton" />
        <div className="hero-vehicle-card-skeleton is-active" />
        <div className="hero-vehicle-card-skeleton" />
      </div>
    );
  }

  if (!featuredVehicles.length) {
    return (
      <div className="hero-vehicle-carousel hero-vehicle-carousel--fallback">
        <Link href="/veiculos" className="hero-vehicle-fallback-link">
          <Image src="/images/carro-banner-home.png" alt="Confira os veículos SAVOL" width={963} height={520} priority />
          <span>Ver veículos disponíveis</span>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`hero-vehicle-carousel hero-vehicle-carousel--moving-${motionDirection}`}
      aria-roledescription="carrossel"
      aria-label="Veículos em destaque"
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") goToPrevious();
        if (event.key === "ArrowRight") goToNext();
      }}
    >
      <div className="hero-vehicle-stage">
        {featuredVehicles.map((vehicle, index) => {
          const offset = getCircularOffset(index, activeIndex, featuredVehicles.length);
          const position = offset === 0 ? "active" : offset === -1 ? "prev" : offset === 1 ? "next" : offset < 0 ? "far-prev" : "far-next";
          const vehicleUrl = getVehicleUrl(vehicle.url, vehicle.slug);

          return (
            <article className={`hero-vehicle-card hero-vehicle-card--${position}`} key={vehicle.id} aria-hidden={offset !== 0}>
              <span className="hero-vehicle-card-label">{offset === 0 ? "Destaque" : "Seminovo"}</span>
              <div className="hero-vehicle-card-media">
                <Image
                  src={vehicle.image}
                  alt={vehicle.name}
                  fill
                  sizes="(min-width: 1081px) 280px, (min-width: 761px) 320px, 86vw"
                  priority={offset === 0}
                />
              </div>
              <div className="hero-vehicle-card-content">
                <p className="hero-vehicle-card-brand">{vehicle.brand}</p>
                <h2>{vehicle.model || vehicle.name}</h2>
                <p className="hero-vehicle-card-specs">{vehicle.year} <span aria-hidden="true">|</span> {vehicle.km}</p>
                <p className="hero-vehicle-card-price">{vehicle.price}</p>
                <Link href={vehicleUrl} className="hero-vehicle-card-action" tabIndex={offset === 0 ? 0 : -1}>
                  Ver oferta
                </Link>
              </div>
            </article>
          );
        })}

        {featuredVehicles.length > 1 ? (
          <>
            <button type="button" className="hero-vehicle-arrow hero-vehicle-arrow--prev" onClick={goToPrevious} aria-label="Veículo anterior">
              <ChevronLeft size={22} />
            </button>
            <button type="button" className="hero-vehicle-arrow hero-vehicle-arrow--next" onClick={goToNext} aria-label="Próximo veículo">
              <ChevronRight size={22} />
            </button>
          </>
        ) : null}
      </div>

      {featuredVehicles.length > 1 ? (
        <div className="hero-vehicle-dots" aria-label="Selecionar veículo em destaque">
          {featuredVehicles.map((vehicle, index) => (
            <button
              type="button"
              key={vehicle.id}
              className={index === activeIndex ? "is-active" : ""}
              onClick={() => goToIndex(index)}
              aria-label={`Mostrar ${vehicle.brand} ${vehicle.model}`}
              aria-current={index === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
