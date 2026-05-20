"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Gauge,
  GitBranch,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  UserRound,
  WalletCards,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  vehicleId: number;
  name: string;
  subtitle: string;
  image: string;
  gallery?: string[];
  year: string;
  transmission: string;
  fuel: string;
  km: string;
  store: string;
  oldPrice?: string;
  price: string;
  detailUrl?: string;
  qualityTag?: string;
  delay?: number;
  variant?: "grid" | "list";
};

function normalizeTag(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function resolveTagTone(value: string): "laudo" | "garantia" | "disponivel" {
  const normalized = normalizeTag(value);
  if (normalized.includes("laudo")) return "laudo";
  if (normalized.includes("garantia")) return "garantia";
  return "disponivel";
}

function parseMoney(value: string): number | null {
  if (!value) return null;
  let cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;

  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/\./g, "");
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function formatMoney(value: number, minimumFractionDigits = 0, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
}

function resolveOldPrice(oldPrice: string | undefined, price: string): string {
  if (oldPrice && oldPrice.trim()) return oldPrice;
  const currentValue = parseMoney(price);
  if (currentValue == null) return "";
  return `De ${formatMoney(currentValue + 10000)}`;
}

function formatEntryInput(value: number): string {
  return formatMoney(Math.max(0, value), 0, 0);
}

function parseEntryInput(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return 0;
  return Number(digits);
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

const galleryCacheByVehicle = new Map<number, string[]>();
const galleryInFlightByVehicle = new Map<number, Promise<string[]>>();

async function loadVehicleGallery(vehicleId: number): Promise<string[]> {
  if (galleryCacheByVehicle.has(vehicleId)) {
    return galleryCacheByVehicle.get(vehicleId) ?? [];
  }

  if (!galleryInFlightByVehicle.has(vehicleId)) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const request = fetch(`/api/veiculos/${vehicleId}/galeria`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then((response) => (response.ok ? response.json() : { gallery: [] }))
      .then((payload: { gallery?: string[] }) => {
        const items = Array.isArray(payload.gallery) ? payload.gallery.filter(Boolean) : [];
        galleryCacheByVehicle.set(vehicleId, items);
        return items;
      })
      .catch(() => [])
      .finally(() => {
        clearTimeout(timeoutId);
        galleryInFlightByVehicle.delete(vehicleId);
      });

    galleryInFlightByVehicle.set(vehicleId, request);
  }

  return (await galleryInFlightByVehicle.get(vehicleId)) ?? [];
}

export function VehicleOfferCard({
  vehicleId,
  name,
  subtitle,
  image,
  gallery = [],
  year,
  transmission,
  fuel,
  km,
  store,
  oldPrice = "",
  price,
  detailUrl = "#",
  qualityTag = "Disponível",
  delay = 0,
  variant = "grid"
}: Props) {
  const financeId = useId();
  const calculationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const galleryLoadingGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const normalizedTag = normalizeTag(qualityTag);
  const showTag = Boolean(qualityTag.trim()) && !normalizedTag.includes("seminovo");
  const tagTone = resolveTagTone(qualityTag);
  const resolvedOldPrice = resolveOldPrice(oldPrice, price);
  const priceValue = parseMoney(price) ?? 0;
  const defaultEntryValue = useMemo(() => Math.round(priceValue * 0.3), [priceValue]);
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [isSimulatingFinance, setIsSimulatingFinance] = useState(false);
  const [didSimulateFinance, setDidSimulateFinance] = useState(false);
  const [isLoadingRemoteGallery, setIsLoadingRemoteGallery] = useState(false);
  const [remoteGallery, setRemoteGallery] = useState<string[]>([]);
  const [entryInput, setEntryInput] = useState(formatEntryInput(defaultEntryValue));
  const [installments, setInstallments] = useState(48);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const installmentOptions = [12, 24, 36, 48, 60, 72];
  const modalTitle = useMemo(() => {
    const normalizedName = normalizeSpaces(name);
    const normalizedSubtitle = normalizeSpaces(subtitle);

    if (normalizedSubtitle && normalizedName.toLowerCase().endsWith(normalizedSubtitle.toLowerCase())) {
      const shortName = normalizeSpaces(normalizedName.slice(0, normalizedName.length - normalizedSubtitle.length));
      if (shortName) return shortName;
    }

    const chunks = normalizedName.split(" ");
    if (chunks.length >= 2) {
      return `${chunks[0]} ${chunks[1]}`.trim();
    }

    return normalizedName;
  }, [name, subtitle]);
  const fallbackModalGallery = useMemo(() => {
    const items = Array.from(new Set([image, ...gallery].filter(Boolean)));
    return items.length ? items : ["/images/hero-car.png"];
  }, [gallery, image]);
  const modalGallery = useMemo(() => {
    const combined = Array.from(new Set([...remoteGallery, ...fallbackModalGallery].filter(Boolean)));
    return combined.length ? combined : ["/images/hero-car.png"];
  }, [fallbackModalGallery, remoteGallery]);

  const entryValue = Math.min(parseEntryInput(entryInput), priceValue);
  const financedValue = Math.max(priceValue - entryValue, 0);
  const installmentValue = installments > 0 ? financedValue / installments : 0;

  useEffect(() => {
    setEntryInput(formatEntryInput(defaultEntryValue));
  }, [defaultEntryValue]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (calculationTimerRef.current) {
        clearTimeout(calculationTimerRef.current);
      }
      if (galleryLoadingGuardRef.current) {
        clearTimeout(galleryLoadingGuardRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isFinanceModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFinanceModalOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFinanceModalOpen]);

  const loadGalleryOnDemand = () => {
    if (vehicleId <= 0) return;

    if (galleryCacheByVehicle.has(vehicleId)) {
      const cachedItems = galleryCacheByVehicle.get(vehicleId) ?? [];
      if (isMountedRef.current) {
        setRemoteGallery(cachedItems);
      }
      return;
    }

    setIsLoadingRemoteGallery(true);
    if (galleryLoadingGuardRef.current) {
      clearTimeout(galleryLoadingGuardRef.current);
    }
    galleryLoadingGuardRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsLoadingRemoteGallery(false);
    }, 4500);

    void loadVehicleGallery(vehicleId)
      .then((items) => {
        if (!isMountedRef.current) return;
        setRemoteGallery(items);
      })
      .finally(() => {
        if (galleryLoadingGuardRef.current) {
          clearTimeout(galleryLoadingGuardRef.current);
          galleryLoadingGuardRef.current = null;
        }
        if (!isMountedRef.current) return;
        setIsLoadingRemoteGallery(false);
      });
  };

  const openFinanceModal = () => {
    setInstallments(48);
    setEntryInput(formatEntryInput(defaultEntryValue));
    setDidSimulateFinance(false);
    setIsSimulatingFinance(false);
    setIsLoadingRemoteGallery(false);
    setSelectedImageIndex(0);
    setRemoteGallery(galleryCacheByVehicle.get(vehicleId) ?? []);
    setIsFinanceModalOpen(true);
    loadGalleryOnDemand();
  };

  const closeFinanceModal = () => {
    if (calculationTimerRef.current) {
      clearTimeout(calculationTimerRef.current);
      calculationTimerRef.current = null;
    }
    if (galleryLoadingGuardRef.current) {
      clearTimeout(galleryLoadingGuardRef.current);
      galleryLoadingGuardRef.current = null;
    }
    setIsSimulatingFinance(false);
    setIsLoadingRemoteGallery(false);
    setIsFinanceModalOpen(false);
  };

  const handleSimulateFinance = () => {
    if (isSimulatingFinance || priceValue <= 0) return;
    setDidSimulateFinance(false);
    setIsSimulatingFinance(true);

    if (calculationTimerRef.current) {
      clearTimeout(calculationTimerRef.current);
    }

    calculationTimerRef.current = setTimeout(() => {
      setIsSimulatingFinance(false);
      setDidSimulateFinance(true);
    }, 3000);
  };

  const handleEntryChange = (value: string) => {
    const numeric = parseEntryInput(value);
    setEntryInput(formatEntryInput(numeric));
    setDidSimulateFinance(false);
  };

  const handleInstallmentsChange = (value: number) => {
    setInstallments(value);
    setDidSimulateFinance(false);
  };

  const resultLabel = didSimulateFinance
    ? `Parcelas de ${formatMoney(installmentValue, 2, 2)} - Saiba mais`
    : "Simular parcelas";
  const resolvedDetailUrl = detailUrl && detailUrl !== "#" ? detailUrl : "/veiculos";
  const detailUrlIsExternal = isExternalUrl(resolvedDetailUrl);

  const goToNextGalleryImage = () => {
    setSelectedImageIndex((current) => (current + 1) % modalGallery.length);
  };

  const goToPreviousGalleryImage = () => {
    setSelectedImageIndex((current) => (current - 1 + modalGallery.length) % modalGallery.length);
  };

  return (
    <>
      <motion.article
        className={`offer-card offer-card--${variant}`}
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, delay, ease: "easeOut" }}
      >
        <div className="offer-media">
          {showTag && <span className={`offer-tag offer-tag--${tagTone}`}>{qualityTag}</span>}
          <Image src={image} alt={name} width={630} height={360} />
        </div>

        <div className="offer-content">
          <div className="offer-body">
            <h3>{name}</h3>
            <p className="offer-subtitle">{subtitle}</p>

            <div className="offer-specs">
              <span className="offer-spec-item">
                <CalendarDays size={16} /> {year}
              </span>
              <span className="offer-spec-item">
                <GitBranch size={16} /> {transmission}
              </span>
              <span className="offer-spec-item">
                <Fuel size={16} /> {fuel}
              </span>
              <span className="offer-spec-item">
                <Gauge size={16} /> {km}
              </span>
            </div>

            <div className="offer-highlights">
              <span>
                <UserRound size={18} /> Único dono
              </span>
              <span>
                <ShieldCheck size={18} /> Garantia de fábrica
              </span>
            </div>
          </div>

          <div className="offer-footer">
            {Boolean(resolvedOldPrice) && <p className="offer-old-price">{resolvedOldPrice}</p>}
            <p className="offer-price">
              Por <strong>{price}</strong>
            </p>

            <div className="offer-store-wrap">
              <p className="offer-store">
                <MapPin size={16} />
                <span className="offer-store-name">Loja: {store}</span>
              </p>
              {detailUrlIsExternal ? (
                <a className="offer-store-link" href={resolvedDetailUrl} target="_blank" rel="noopener noreferrer">
                  Como chegar
                </a>
              ) : (
                <Link className="offer-store-link" href={resolvedDetailUrl}>
                  Como chegar
                </Link>
              )}
            </div>

            <div className="offer-actions">
              <button type="button" className="offer-primary" onClick={openFinanceModal}>
                <WalletCards size={20} /> Ver parcelas
              </button>
              {detailUrlIsExternal ? (
                <a className="offer-secondary" href={resolvedDetailUrl} target="_blank" rel="noopener noreferrer">
                  Saiba mais
                </a>
              ) : (
                <Link className="offer-secondary" href={resolvedDetailUrl}>
                  Saiba mais
                </Link>
              )}
            </div>
          </div>
        </div>
      </motion.article>

      <AnimatePresence>
        {isFinanceModalOpen && (
          <motion.div
            className="finance-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeFinanceModal}
          >
            <motion.div
              className="finance-modal"
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="finance-modal-close" onClick={closeFinanceModal} aria-label="Fechar modal">
                <X size={20} />
              </button>

              <div className="finance-modal-grid">
                <div className="finance-modal-gallery">
                  <div className="finance-modal-media">
                    <Image src={modalGallery[selectedImageIndex] ?? image} alt={name} width={920} height={620} />
                    {modalGallery.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="finance-modal-gallery-nav finance-modal-gallery-nav--prev"
                          aria-label="Imagem anterior"
                          onClick={goToPreviousGalleryImage}
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          type="button"
                          className="finance-modal-gallery-nav finance-modal-gallery-nav--next"
                          aria-label="Próxima imagem"
                          onClick={goToNextGalleryImage}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="finance-modal-gallery-strip">
                    {modalGallery.map((galleryImage, index) => (
                      <button
                        type="button"
                        key={`${galleryImage}-${index}`}
                        className={`finance-modal-thumb${index === selectedImageIndex ? " is-active" : ""}`}
                        onClick={() => setSelectedImageIndex(index)}
                        aria-label={`Visualizar imagem ${index + 1}`}
                      >
                        <Image src={galleryImage} alt={`${name} - miniatura ${index + 1}`} width={150} height={92} />
                      </button>
                    ))}
                  </div>
                  {isLoadingRemoteGallery && (
                    <p className="finance-modal-gallery-loading">
                      <LoaderCircle size={14} className="spin" /> Carregando galeria completa...
                    </p>
                  )}
                </div>

                <div className="finance-modal-content">
                  <div className="finance-modal-head">
                    <div>
                      <h3>{modalTitle}</h3>
                      <p>{subtitle}</p>
                    </div>
                  </div>

                  <div className="finance-modal-specs">
                    <span className="offer-spec-item">
                      <CalendarDays size={16} /> {year}
                    </span>
                    <span className="offer-spec-item">
                      <GitBranch size={16} /> {transmission}
                    </span>
                    <span className="offer-spec-item">
                      <Fuel size={16} /> {fuel}
                    </span>
                    <span className="offer-spec-item">
                      <Gauge size={16} /> {km}
                    </span>
                  </div>

                  <p className="finance-modal-description">
                    Veículo revisado, com ótima procedência e pronto para o dia a dia. Simule seu financiamento direto no modal.
                  </p>

                  <div className="finance-modal-divider" />

                  <div className="finance-modal-bottom">
                    <div className="finance-modal-price">
                      {Boolean(resolvedOldPrice) && <p className="finance-modal-old-price">{resolvedOldPrice}</p>}
                      <p className="finance-modal-current-price">
                        Por <strong>{price}</strong>
                      </p>
                      <p className="finance-modal-store">
                        <MapPin size={16} /> Loja: {store}
                      </p>
                    </div>

                    <div className="finance-modal-form">
                      <h4>Simule seu financiamento</h4>
                      <label htmlFor={`entrada-${financeId}`}>Entrada</label>
                      <input
                        id={`entrada-${financeId}`}
                        type="text"
                        inputMode="numeric"
                        value={entryInput}
                        onChange={(event) => handleEntryChange(event.target.value)}
                      />

                      <label htmlFor={`parcelas-${financeId}`}>Parcelas</label>
                      <select
                        id={`parcelas-${financeId}`}
                        value={installments}
                        onChange={(event) => handleInstallmentsChange(Number(event.target.value))}
                      >
                        {installmentOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}x
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="finance-modal-simulate-btn"
                    onClick={handleSimulateFinance}
                    disabled={isSimulatingFinance}
                  >
                    {isSimulatingFinance ? (
                      <>
                        <LoaderCircle size={18} className="spin" /> Calculando parcelas...
                      </>
                    ) : (
                      <>
                        <WalletCards size={18} /> {resultLabel}
                      </>
                    )}
                  </button>

                  <p className="finance-modal-security">
                    <ShieldCheck size={18} /> Financiamento 100% seguro
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
