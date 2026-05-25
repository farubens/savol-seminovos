"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VehicleOfferCard } from "@/components/VehicleOfferCard";
import { MapDirectionsModal } from "@/components/MapDirectionsModal";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Gauge,
  GitBranch,
  MapPin,
  Printer,
  Share2,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
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

type StoreItem = {
  id: number;
  slug: string;
  name: string;
  address: string;
  phone: string;
  mapUrl: string;
};

type StoreApiResponse = {
  items?: StoreItem[];
};

type LeadForm = {
  name: string;
  interest: string;
  phone: string;
  email: string;
  message: string;
  consent: boolean;
};

type DetailsTab = "sobre" | "opcionais" | "ficha" | "financiamento" | "loja";

const FALLBACK_IMAGE = "/images/em-preparacao.jpg";
const PREPARATION_IMAGE_TOKEN = "/images/em-preparacao";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removeStorePrefix(value: string): string {
  return value.replace(/^loja:\s*/i, "").trim();
}

function getStoreMatch(storeName: string, stores: StoreItem[]): StoreItem | null {
  const normalizedVehicleStore = normalize(removeStorePrefix(storeName));
  if (!normalizedVehicleStore) return null;

  return (
    stores.find((store) => {
      const normalizedStore = normalize(store.name);
      return normalizedStore === normalizedVehicleStore || normalizedStore.includes(normalizedVehicleStore) || normalizedVehicleStore.includes(normalizedStore);
    }) ?? null
  );
}

function inferCategoryLabel(vehicle: ApiVehicle): string {
  const source = normalize(`${vehicle.name} ${vehicle.model} ${vehicle.version}`);
  if (source.includes("suv") || source.includes("crossover")) return "SUV";
  if (source.includes("hatch")) return "Hatch";
  if (source.includes("sedan")) return "Sedan";
  if (source.includes("picape") || source.includes("pickup") || source.includes("caminhonete")) return "Picape";
  return "Seminovos";
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, "").slice(0, 11);
}

function isUnknownValue(value: string): boolean {
  const normalized = normalize(value);
  return !normalized || normalized.includes("nao informado") || normalized.includes("sob consulta");
}

function isPreparationImage(src: string): boolean {
  return src.toLowerCase().includes(PREPARATION_IMAGE_TOKEN);
}

export function VehicleDetailsPageClient({ slug }: Props) {
  const [vehicle, setVehicle] = useState<ApiVehicle | null>(null);
  const [storeItem, setStoreItem] = useState<StoreItem | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [gallery, setGallery] = useState<string[]>([]);
  const [slideDirection, setSlideDirection] = useState(1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedAction, setCopiedAction] = useState(false);
  const [detailsTab, setDetailsTab] = useState<DetailsTab>("sobre");
  const [relatedVehicles, setRelatedVehicles] = useState<ApiVehicle[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const [leadForm, setLeadForm] = useState<LeadForm>({
    name: "",
    interest: "",
    phone: "",
    email: "",
    message: "",
    consent: true
  });
  const [leadErrors, setLeadErrors] = useState<Record<string, string>>({});
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);

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
          setLeadForm((current) => ({ ...current, interest: firstVehicle.name }));
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
    if (isPreparationImage(vehicle?.image ?? "")) return;
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
  }, [vehicle?.id, vehicle?.image]);

  useEffect(() => {
    if (!vehicle?.store) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 9000);

    fetch("/api/lojas?per_page=30", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: StoreApiResponse | null) => {
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const matchedStore = getStoreMatch(vehicle.store, items);
        setStoreItem(matchedStore);
      })
      .catch(() => {
        setStoreItem(null);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [vehicle?.store]);

  useEffect(() => {
    if (!vehicle?.id) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 9000);
    setLoadingRelated(true);

    fetch("/api/veiculos?per_page=24", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: VehicleApiResponse | null) => {
        const all = Array.isArray(payload?.items) ? payload.items : [];
        const others = all.filter((item) => item.id !== vehicle.id);
        const sameBrand = others.filter((item) => normalize(item.brand) === normalize(vehicle.brand));
        const sameCategory = others.filter(
          (item) => normalize(item.brand) !== normalize(vehicle.brand) && inferCategoryLabel(item) === inferCategoryLabel(vehicle)
        );
        const fallback = others.filter(
          (item) => normalize(item.brand) !== normalize(vehicle.brand) && inferCategoryLabel(item) !== inferCategoryLabel(vehicle)
        );

        setRelatedVehicles([...sameBrand, ...sameCategory, ...fallback].slice(0, 3));
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        setLoadingRelated(false);
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
  }, [isLightboxOpen]);

  const isPreparationFallback = useMemo(() => isPreparationImage(vehicle?.image ?? FALLBACK_IMAGE), [vehicle?.image]);
  const activeImage = useMemo(
    () => (isPreparationFallback ? vehicle?.image || FALLBACK_IMAGE : gallery[selectedIndex] ?? vehicle?.image ?? FALLBACK_IMAGE),
    [gallery, isPreparationFallback, selectedIndex, vehicle?.image]
  );
  const galleryItems = useMemo(
    () => (isPreparationFallback ? [vehicle?.image || FALLBACK_IMAGE] : gallery.length ? gallery : [vehicle?.image || FALLBACK_IMAGE]),
    [gallery, isPreparationFallback, vehicle?.image]
  );

  const breadcrumbCategory = vehicle ? inferCategoryLabel(vehicle) : "";
  const storeTitle = removeStorePrefix(vehicle?.store ?? "Unidade Savol");
  const storeAddress = storeItem?.address || (!isUnknownValue(vehicle?.city ?? "") ? `${vehicle?.city} - ${vehicle?.uf}` : "Endereço sob consulta");
  const storePhone = storeItem?.phone || "(11) 2222-3333";

  const technicalRows = useMemo(
    () =>
      vehicle
        ? [
            ["Modelo", vehicle.name],
            ["Ano/Modelo", vehicle.year],
            ["Quilometragem", vehicle.km],
            ["Combustível", vehicle.fuel],
            ["Câmbio", vehicle.transmission],
            ["Cor", vehicle.color],
            ["Cidade", `${vehicle.city} - ${vehicle.uf}`],
            ["Loja", storeTitle]
          ]
        : [],
    [vehicle, storeTitle]
  );

  const optionals = useMemo(
    () => [
      "Ar-condicionado digital",
      "Direção elétrica",
      "Chave presencial",
      "Piloto automático",
      "Câmera de ré",
      "Sensor de estacionamento",
      "Multimídia com espelhamento",
      "Rodas de liga leve"
    ],
    []
  );

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

  const whatsappHref = useMemo(() => {
    if (!vehicle) return "";
    const digits = normalizePhone(storePhone);
    const phone = digits.length >= 10 ? `55${digits}` : "551122223333";
    const message = encodeURIComponent(`Olá, tenho interesse no veículo ${vehicle.name}.`);
    return `https://wa.me/${phone}?text=${message}`;
  }, [vehicle, storePhone]);

  const handleShare = async () => {
    if (!vehicle) return;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: vehicle.name,
          text: `Confira este veículo da Savol: ${vehicle.name}`,
          url: shareUrl
        });
        return;
      } catch {
        return;
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedAction(true);
      window.setTimeout(() => setCopiedAction(false), 1400);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const validateLeadForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!leadForm.name.trim()) nextErrors.name = "Informe seu nome";
    if (!leadForm.phone.trim() || normalizePhone(leadForm.phone).length < 10) nextErrors.phone = "Informe telefone válido";
    if (!leadForm.email.trim() || !/^\S+@\S+\.\S+$/.test(leadForm.email)) nextErrors.email = "Informe e-mail válido";
    if (!leadForm.consent) nextErrors.consent = "Autorize o contato para enviar";

    setLeadErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLeadSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateLeadForm()) return;

    setLeadSuccess(true);
    setLeadErrors({});
  };

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
      <nav className="vehicle-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/veiculos">Veículos</Link>
        <span>/</span>
        <span>{breadcrumbCategory}</span>
        <span>/</span>
        <span>{vehicle.brand}</span>
        <span>/</span>
        <span>{vehicle.model}</span>
        <span>/</span>
        <span className="vehicle-breadcrumb-current">{vehicle.subtitle}</span>
      </nav>

      <div className="vehicle-details-layout">
        <div className="vehicle-details-gallery-col">
          <article className="vehicle-media-card">
            {!isPreparationFallback && <span className="vehicle-media-badge">{normalize(vehicle.qualityTag).includes("dono") ? "Único dono" : vehicle.qualityTag}</span>}

            {!isPreparationFallback && (
              <>
                <button type="button" className="vehicle-media-arrow vehicle-media-arrow--left" aria-label="Foto anterior" onClick={goToPrevImage}>
                  <ChevronLeft size={20} />
                </button>
                <button type="button" className="vehicle-media-arrow vehicle-media-arrow--right" aria-label="Próxima foto" onClick={goToNextImage}>
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${activeImage}-${selectedIndex}`}
                className="vehicle-media-slide"
                custom={slideDirection}
                initial={{ opacity: 0, x: slideDirection > 0 ? 32 : -32, scale: 1.03, filter: "blur(5px)" }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: slideDirection > 0 ? -24 : 24, scale: 0.99, filter: "blur(4px)" }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  className={`vehicle-media-hit${isPreparationFallback ? " vehicle-media-hit--preparation" : ""}`}
                  onClick={() => {
                    if (!isPreparationFallback) setIsLightboxOpen(true);
                  }}
                  aria-label={isPreparationFallback ? "Imagem do veículo" : "Abrir imagem em tela cheia"}
                >
                  <Image src={activeImage} alt={vehicle.name} width={1280} height={860} />
                </button>
              </motion.div>
            </AnimatePresence>

            {!isPreparationFallback && (
              <div className="vehicle-media-footer">
                <button type="button" className="vehicle-media-view-btn" onClick={() => setIsLightboxOpen(true)}>
                  Ver fotos
                </button>
                <span className="vehicle-media-counter">
                  {selectedIndex + 1}/{galleryItems.length}
                </span>
              </div>
            )}
          </article>

          {!isPreparationFallback && (
            <div className="vehicle-thumb-shell">
              <button type="button" className="vehicle-thumb-nav vehicle-thumb-nav--left" aria-label="Miniaturas anteriores" onClick={() => scrollThumbs("left")}>
                <ChevronLeft size={17} />
              </button>

              <div className="vehicle-thumb-track" ref={thumbsRef}>
                {galleryItems.map((imageUrl, index) => (
                  <button type="button" key={`${imageUrl}-${index}`} className={`vehicle-thumb-item${selectedIndex === index ? " is-active" : ""}`} onClick={() => goToImage(index)}>
                    <Image src={imageUrl} alt={`${vehicle.name} - foto ${index + 1}`} width={150} height={98} />
                  </button>
                ))}
              </div>

              <button type="button" className="vehicle-thumb-nav vehicle-thumb-nav--right" aria-label="Próximas miniaturas" onClick={() => scrollThumbs("right")}>
                <ChevronRight size={17} />
              </button>
            </div>
          )}

          {!isPreparationFallback && loadingGallery && <p className="vehicle-details-gallery-status">Carregando galeria completa...</p>}
        </div>

        <aside className="vehicle-details-side">
          <article className="vehicle-info-card">
            <h1>{vehicle.name}</h1>
            <p className="vehicle-info-subtitle">{vehicle.subtitle}</p>
            <p className="vehicle-year-badge">Ano/Modelo {vehicle.year}</p>

            {vehicle.oldPrice ? <p className="vehicle-old-price">{vehicle.oldPrice}</p> : null}
            <p className="vehicle-price-line">
              Por <strong>{vehicle.price}</strong>
            </p>

            <div className="vehicle-store-block">
              <h3>
                <MapPin size={16} /> {storeTitle}
              </h3>
              <p>{storeAddress}</p>
            </div>

            <div className="vehicle-quick-actions">
              <button type="button" className="vehicle-quick-btn" onClick={handleShare}>
                <Share2 size={16} /> {copiedAction ? "Copiado" : "Compartilhar"}
              </button>
              <button type="button" className="vehicle-quick-btn" onClick={handlePrint}>
                <Printer size={16} /> Imprimir
              </button>
              <a href={whatsappHref} className="vehicle-quick-btn" target="_blank" rel="noreferrer">
                <Image
                  src="/images/whatsapp_icon.png"
                  alt=""
                  width={18}
                  height={18}
                  className="vehicle-whatsapp-logo"
                />
                WhatsApp
              </a>
            </div>
          </article>

          <article className="vehicle-lead-card">
            <h2>Envie uma proposta</h2>
            <form className="vehicle-lead-form" onSubmit={handleLeadSubmit}>
              <div className="vehicle-lead-grid">
                <label className="vehicle-field">
                  <span>Nome completo</span>
                  <input
                    type="text"
                    value={leadForm.name}
                    onChange={(event) => {
                      setLeadForm((current) => ({ ...current, name: event.target.value }));
                      setLeadErrors((current) => ({ ...current, name: "" }));
                    }}
                  />
                  {leadErrors.name ? <small>{leadErrors.name}</small> : null}
                </label>

                <label className="vehicle-field">
                  <span>Interesse em</span>
                  <select value={leadForm.interest} onChange={(event) => setLeadForm((current) => ({ ...current, interest: event.target.value }))}>
                    <option value={vehicle.name}>{vehicle.name}</option>
                  </select>
                </label>

                <label className="vehicle-field">
                  <span>Telefone / WhatsApp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={leadForm.phone}
                    onChange={(event) => {
                      setLeadForm((current) => ({ ...current, phone: normalizePhone(event.target.value) }));
                      setLeadErrors((current) => ({ ...current, phone: "" }));
                    }}
                  />
                  {leadErrors.phone ? <small>{leadErrors.phone}</small> : null}
                </label>

                <label className="vehicle-field">
                  <span>E-mail</span>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(event) => {
                      setLeadForm((current) => ({ ...current, email: event.target.value }));
                      setLeadErrors((current) => ({ ...current, email: "" }));
                    }}
                  />
                  {leadErrors.email ? <small>{leadErrors.email}</small> : null}
                </label>

                <label className="vehicle-field vehicle-field--full">
                  <span>Mensagem (opcional)</span>
                  <textarea
                    rows={4}
                    placeholder="Conte-nos mais sobre o que procura..."
                    value={leadForm.message}
                    onChange={(event) => setLeadForm((current) => ({ ...current, message: event.target.value.slice(0, 500) }))}
                  />
                </label>
              </div>

              <label className="vehicle-consent">
                <input
                  type="checkbox"
                  checked={leadForm.consent}
                  onChange={(event) => {
                    setLeadForm((current) => ({ ...current, consent: event.target.checked }));
                    setLeadErrors((current) => ({ ...current, consent: "" }));
                  }}
                />
                <span>Autorizo o contato da Savol Seminovos por e-mail, telefone ou WhatsApp.</span>
              </label>
              {leadErrors.consent ? <p className="vehicle-consent-error">{leadErrors.consent}</p> : null}

              <button type="submit" className="vehicle-lead-submit">
                Enviar proposta
              </button>

              {leadSuccess ? <p className="vehicle-lead-success">Proposta enviada! Retornaremos em breve.</p> : null}
            </form>
          </article>
        </aside>
      </div>

      <section className="vehicle-extra">
        <article className="vehicle-extra-top">
          <div className="vehicle-extra-main">
            <div className="vehicle-extra-tabs">
              <button type="button" className={detailsTab === "sobre" ? "is-active" : ""} onClick={() => setDetailsTab("sobre")}>
                Sobre o veículo
              </button>
              <button type="button" className={detailsTab === "opcionais" ? "is-active" : ""} onClick={() => setDetailsTab("opcionais")}>
                Opcionais
              </button>
              <button type="button" className={detailsTab === "ficha" ? "is-active" : ""} onClick={() => setDetailsTab("ficha")}>
                Ficha técnica
              </button>
              <button type="button" className={detailsTab === "financiamento" ? "is-active" : ""} onClick={() => setDetailsTab("financiamento")}>
                Financiamento
              </button>
              <button type="button" className={detailsTab === "loja" ? "is-active" : ""} onClick={() => setDetailsTab("loja")}>
                Loja
              </button>
            </div>

            {detailsTab === "sobre" && (
              <div className="vehicle-extra-panel">
                <h3>Sobre este veículo</h3>
                <div className="vehicle-tab-specs">
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
                <p>
                  {vehicle.name} {vehicle.subtitle}. Veículo com {vehicle.transmission.toLowerCase()} e {vehicle.fuel.toLowerCase()}, pronto para uso diário com conforto,
                  segurança e tecnologia.
                </p>
                <p>
                  Unidade: {storeTitle}. {isUnknownValue(storeAddress) ? "Endereço sob consulta." : storeAddress}
                </p>
                <div className="vehicle-extra-badges">
                  <span>
                    <UserRound size={15} /> Histórico verificado
                  </span>
                  <span>
                    <BadgeCheck size={15} /> Revisão em dia
                  </span>
                  <span>
                    <ShieldCheck size={15} /> Garantia de fábrica
                  </span>
                  <span>
                    <CheckCircle2 size={15} /> Laudo cautelar aprovado
                  </span>
                </div>
              </div>
            )}

            {detailsTab === "opcionais" && (
              <div className="vehicle-extra-panel">
                <h3>Opcionais e conforto</h3>
                <div className="vehicle-optionals-grid">
                  {optionals.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            )}

            {detailsTab === "ficha" && (
              <div className="vehicle-extra-panel">
                <h3>Ficha técnica resumida</h3>
                <div className="vehicle-tab-specs">
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
                <div className="vehicle-tech-list">
                  {technicalRows.map(([label, value]) => (
                    <div key={label}>
                      <strong>{label}</strong>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailsTab === "financiamento" && (
              <div className="vehicle-extra-panel">
                <h3>Simule seu financiamento</h3>
                <p>As melhores taxas com aprovação rápida. Entrada facilitada e parcelas ajustadas ao seu perfil.</p>
                <button type="button" className="vehicle-finance-btn">
                  Simular agora
                </button>
              </div>
            )}

            {detailsTab === "loja" && (
              <div className="vehicle-extra-panel">
                <h3>Informações da loja</h3>
                <p>{storeTitle}</p>
                <p>{storeAddress}</p>
                <p>{storePhone}</p>
                <button type="button" className="vehicle-map-link" onClick={() => setIsDirectionsOpen(true)}>
                  Ver rota no mapa
                </button>
              </div>
            )}
          </div>
        </article>

        <article className="vehicle-related">
          <header>
            <h3>Outros veículos que podem te interessar</h3>
          </header>
          <div className="vehicle-related-grid">
            {loadingRelated &&
              Array.from({ length: 3 }).map((_, index) => (
                <article className="vehicle-related-card is-loading" key={`related-skeleton-${index}`}>
                  <div />
                </article>
              ))}

            {!loadingRelated &&
              relatedVehicles.map((item) => (
                <VehicleOfferCard
                  key={item.id}
                  vehicleId={item.id}
                  name={item.name}
                  subtitle={item.subtitle}
                  image={item.image || FALLBACK_IMAGE}
                  gallery={item.gallery}
                  year={item.year}
                  transmission={item.transmission}
                  fuel={item.fuel}
                  km={item.km}
                  store={removeStorePrefix(item.store)}
                  oldPrice={item.oldPrice}
                  price={item.price}
                  detailUrl={item.url}
                  qualityTag={item.qualityTag}
                />
              ))}
          </div>
        </article>
      </section>

      <AnimatePresence>
        {isLightboxOpen && !isPreparationFallback && (
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

      <MapDirectionsModal
        open={isDirectionsOpen}
        storeName={storeTitle}
        address={storeAddress}
        onClose={() => setIsDirectionsOpen(false)}
      />
    </section>
  );
}
