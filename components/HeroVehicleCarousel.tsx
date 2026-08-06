"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, CheckCircle2, ChevronLeft, ChevronRight, Gauge, ShieldCheck, Sparkles, UserRound, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";
import type { ApiVehicle } from "@/types/home";

const AUTOPLAY_DELAY_MS = 5500;
const FALLBACK_HIGHLIGHT = "Oportunidade";
const PREPARATION_IMAGE_TOKENS = ["/images/em-preparacao", "/images/fallback-atualizado"];
const HIGHLIGHT_PRIORITY: Record<string, number> = {
  garantia: 80,
  "unico dono": 70,
  "baixa km": 60,
  "abaixo fipe": 50,
  impecavel: 40,
  completo: 30,
  oportunidade: 0
};

function isRepasseVehicle(vehicle: { repasse: boolean; qualityTag: string; secondaryHighlights: string[] }): boolean {
  const repasseValue = String(vehicle.repasse).trim().toLowerCase();
  if (repasseValue === "true" || repasseValue === "1") return true;

  const highlights = [vehicle.qualityTag, ...vehicle.secondaryHighlights].join(" ").toLowerCase();
  return highlights.includes("repasse");
}

function isNegotiatingVehicle(vehicle: ApiVehicle): boolean {
  const negotiatingValue = String(vehicle.negotiating).trim().toLowerCase();
  if (negotiatingValue === "true" || negotiatingValue === "1") return true;

  const highlights = normalizeHighlight([vehicle.qualityTag, ...vehicle.secondaryHighlights].join(" "));
  return highlights.includes("negociacao") || highlights.includes("em negociacao");
}

function getVehicleUrl(url: string, slug: string): string {
  if (url.startsWith("/")) return url;
  return `/veiculos/${slug}`;
}

function normalizeHighlight(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getHighlightPriority(value: string): number {
  const normalized = normalizeHighlight(value);
  const priorityEntry = Object.entries(HIGHLIGHT_PRIORITY).find(([key]) => normalized.includes(key));
  return priorityEntry?.[1] ?? 10;
}

function getVehicleHighlight(vehicle: ApiVehicle): string {
  const highlights = [vehicle.qualityTag, ...vehicle.secondaryHighlights]
    .map((highlight) => highlight.trim())
    .filter((highlight) => {
      const normalized = normalizeHighlight(highlight);
      const isBelowFipe = normalized.includes("abaixo") && normalized.includes("fipe");
      return Boolean(normalized) && !normalized.includes("seminovo") && !normalized.includes("repasse") && !isBelowFipe;
    })
    .sort((left, right) => getHighlightPriority(right) - getHighlightPriority(left));

  return highlights[0] || FALLBACK_HIGHLIGHT;
}

function getHighlightTone(value: string): "garantia" | "unico-dono" | "baixa-km" | "fipe" | "impecavel" | "completo" | "default" {
  const normalized = normalizeHighlight(value);
  if (normalized.includes("garantia")) return "garantia";
  if (normalized.includes("unico dono")) return "unico-dono";
  if (normalized.includes("baixa km")) return "baixa-km";
  if (normalized.includes("abaixo") && normalized.includes("fipe")) return "fipe";
  if (normalized.includes("impecavel")) return "impecavel";
  if (normalized.includes("completo")) return "completo";
  return "default";
}

function getHighlightIcon(value: string) {
  const tone = getHighlightTone(value);
  if (tone === "garantia") return ShieldCheck;
  if (tone === "unico-dono") return UserRound;
  if (tone === "baixa-km") return Gauge;
  if (tone === "fipe") return WalletCards;
  if (tone === "impecavel") return Sparkles;
  if (tone === "completo") return CheckCircle2;
  return BadgeCheck;
}

function hasMultipleRealPhotos(vehicle: ApiVehicle): boolean {
  const image = vehicle.image.toLowerCase();
  const isPreparationImage = PREPARATION_IMAGE_TOKENS.some((token) => image.includes(token));
  return !vehicle.preparing && !isPreparationImage && Number(vehicle.photoCount) >= 2;
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
        (vehicle) =>
          !isRepasseVehicle(vehicle) &&
          !isNegotiatingVehicle(vehicle) &&
          hasMultipleRealPhotos(vehicle) &&
          vehicle.image &&
          vehicle.price
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
          const highlight = getVehicleHighlight(vehicle);
          const highlightTone = getHighlightTone(highlight);
          const HighlightIcon = getHighlightIcon(highlight);

          return (
            <article className={`hero-vehicle-card hero-vehicle-card--${position}`} key={vehicle.id} aria-hidden={offset !== 0}>
              <span className={`hero-vehicle-card-label hero-vehicle-card-label--${highlightTone}`}>
                <HighlightIcon size={12} /> {highlight}
              </span>
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
