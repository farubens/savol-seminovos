"use client";

import Image from "next/image";
import { BriefcaseBusiness, Bus, Car, CarFront, ChevronLeft, ChevronRight, Gem, Search, Sparkles, Truck, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";
import { VehicleOfferCard } from "@/components/VehicleOfferCard";
import type { ApiVehicle } from "@/types/home";

type TabKey = "marca" | "categoria" | "eletricos" | "descrever";
type IconKey = "hatch" | "suv" | "picape" | "sedan" | "eletrico" | "executivo" | "premium" | "utilitarios";

type CategoryCardItem = {
  id: string;
  title: string;
  amount: string;
  bgImage: string;
  icon: IconKey;
  href: string;
};

type BrandItem = {
  id: string;
  name: string;
  logo: string;
};

type SelectOption = {
  id: number;
  name: string;
  slug?: string;
  count: number;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "marca", label: "Marca" },
  { key: "categoria", label: "Categoria" },
  { key: "eletricos", label: "Elétricos" },
  { key: "descrever", label: "Pesquisar veículo" }
];

const aiExamples = [
  "SUV automático até R$ 130.000 com baixa quilometragem",
  "Sedan econômico 2022 ou mais novo com multimídia",
  "Picape 4x4 diesel para trabalho e uso urbano",
  "Carro para família com porta-malas grande e segurança"
];

const fallbackBrands: BrandItem[] = [
  { id: "brand-toyota", name: "TOYOTA", logo: "/images/brands/toyota.png" },
  { id: "brand-fiat", name: "FIAT", logo: "/images/brands/fiat.svg" },
  { id: "brand-volkswagen", name: "VOLKSWAGEN", logo: "/images/brands/volkswagen.png" },
  { id: "brand-kia", name: "KIA", logo: "/images/brands/kia.png" },
  { id: "brand-chevrolet", name: "CHEVROLET", logo: "/images/brands/chevrolet.svg" },
  { id: "brand-ford", name: "FORD", logo: "/images/brands/ford.svg" },
  { id: "brand-honda", name: "HONDA", logo: "/images/brands/honda.svg" },
  { id: "brand-hyundai", name: "HYUNDAI", logo: "/images/brands/hyundai.svg" },
  { id: "brand-jeep", name: "JEEP", logo: "/images/brands/jeep.svg" },
  { id: "brand-nissan", name: "NISSAN", logo: "/images/brands/nissan.svg" },
  { id: "brand-renault", name: "RENAULT", logo: "/images/brands/renault.svg" }
];

const brandLogoMap: Record<string, string> = {
  toyota: "/images/brands/toyota.png",
  fiat: "/images/brands/fiat.svg",
  volkswagen: "/images/brands/volkswagen.png",
  peugeot: "/images/brands/peugeot.svg",
  kia: "/images/brands/kia.png",
  mg: "/images/brands/mg.png",
  abarth: "/images/brands/abarth.webp",
  jetour: "/images/brands/jetour.webp",
  citroen: "/images/brands/citroen.png",
  chevrolet: "/images/brands/chevrolet.svg",
  ford: "/images/brands/ford.svg",
  honda: "/images/brands/honda.svg",
  hyundai: "/images/brands/hyundai.svg",
  jeep: "/images/brands/jeep.svg",
  nissan: "/images/brands/nissan.svg",
  renault: "/images/brands/renault.svg"
};

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isElectricLikeVehicle(vehicle: ApiVehicle): boolean {
  const source = normalizeText(`${vehicle.fuel} ${vehicle.name} ${vehicle.model} ${vehicle.version} ${vehicle.subtitle}`);
  return (
    source.includes("eletric") ||
    source.includes("hibrid") ||
    source.includes("hybrid") ||
    source.includes("ev") ||
    source.includes("phev") ||
    source.includes("plug-in")
  );
}

function parsePriceValue(value: string): number | null {
  if (!value) return null;
  let cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;

  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/\./g, "");
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function formatPriceValue(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
}

function buildPriceOptions(prices: number[]): number[] {
  const uniqueSorted = Array.from(new Set(prices)).sort((a, b) => a - b);
  if (uniqueSorted.length <= 8) return uniqueSorted;

  const sampled: number[] = [];
  const slots = 8;
  for (let i = 0; i < slots; i += 1) {
    const index = Math.floor((i * (uniqueSorted.length - 1)) / (slots - 1));
    sampled.push(uniqueSorted[index]);
  }
  return Array.from(new Set(sampled));
}

function parseLoosePrice(value: string): number | null {
  const match = value.match(/(?:r\$\s*)?(\d{2,3}(?:[.\s]\d{3})+|\d{5,7})/i);
  if (!match) return null;
  const digits = match[1].replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const bg = {
  hatch: "/images/categories/hatch.png",
  suv: "/images/categories/suv.png",
  picape: "/images/categories/picape.png",
  sedan: "/images/categories/sedan.png",
  esportivo: "/images/categories/eletricos.png",
  luxo: "/images/categories/eletricos.png",
  utilitarios: "/images/categories/utilitarios.png",
  todos: "/images/categories/todos.png"
};

const iconMap = {
  hatch: CarFront,
  suv: Car,
  picape: Truck,
  sedan: CarFront,
  eletrico: Zap,
  executivo: BriefcaseBusiness,
  premium: Gem,
  utilitarios: Bus
};

const cardsByTab: Record<Exclude<TabKey, "descrever" | "marca">, CategoryCardItem[]> = {
  categoria: [
    { id: "hatch-c", title: "Hatch", amount: "232 veículos", bgImage: bg.hatch, icon: "hatch", href: "/veiculos?bodies=hatch" },
    { id: "sedan-c", title: "Sedan", amount: "198 veículos", bgImage: bg.sedan, icon: "sedan", href: "/veiculos?bodies=sedan" },
    { id: "suv-c", title: "SUV", amount: "312 veículos", bgImage: bg.suv, icon: "suv", href: "/veiculos?bodies=suv" },
    { id: "pickup-c", title: "Pickup", amount: "164 veículos", bgImage: bg.picape, icon: "picape", href: "/veiculos?bodies=pickup" },
    { id: "util-c", title: "Utilitários", amount: "52 veículos", bgImage: bg.utilitarios, icon: "utilitarios", href: "/veiculos?bodies=utilitario" },
    { id: "ele-c", title: "Elétricos", amount: "48 veículos", bgImage: bg.esportivo, icon: "eletrico", href: "/veiculos?q=eletrico" }
  ],
  eletricos: [
    { id: "hev-e", title: "Híbridos", amount: "81 veículos", bgImage: bg.suv, icon: "eletrico", href: "/veiculos?q=hibrido" },
    { id: "bev-e", title: "100% Elétricos", amount: "48 veículos", bgImage: bg.hatch, icon: "eletrico", href: "/veiculos?q=eletrico" },
    { id: "sed-e", title: "Sedan elétrico", amount: "31 veículos", bgImage: bg.sedan, icon: "sedan", href: "/veiculos?q=sedan-eletrico" },
    { id: "suv-e", title: "SUV elétrico", amount: "52 veículos", bgImage: bg.picape, icon: "suv", href: "/veiculos?q=suv-eletrico" },
    { id: "urb-e", title: "Urbanos EV", amount: "36 veículos", bgImage: bg.esportivo, icon: "hatch", href: "/veiculos?q=urbano-eletrico" },
    { id: "pre-e", title: "Premium EV", amount: "27 veículos", bgImage: bg.luxo, icon: "premium", href: "/veiculos?q=premium-eletrico" },
    { id: "uti-e", title: "Utilitários EV", amount: "22 veículos", bgImage: bg.utilitarios, icon: "utilitarios", href: "/veiculos?q=utilitario-eletrico" }
  ]
};

export function CategoryFinder() {
  const router = useRouter();
  const { vehicles } = useHomeSessionData();
  const [activeTab, setActiveTab] = useState<TabKey>("marca");
  const [selectedMarca, setSelectedMarca] = useState("all");
  const [selectedModelo, setSelectedModelo] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [aiQuery, setAiQuery] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const cards = useMemo(() => {
    return activeTab === "categoria" || activeTab === "eletricos" ? cardsByTab[activeTab] : [];
  }, [activeTab]);

  const visualCards = useMemo(() => {
    if (!(activeTab === "categoria" || activeTab === "eletricos")) return [];

    const ctaCard: CategoryCardItem = {
      id: `view-all-${activeTab}`,
      title: "Ver todos",
      amount: "Todas as opções",
      bgImage: bg.todos,
      icon: "hatch",
      href: "/veiculos"
    };

    return [...cards, ctaCard];
  }, [activeTab, cards]);

  const marcaOptions = useMemo<SelectOption[]>(() => {
    const marcaMap = new Map<string, SelectOption>();

    for (const vehicle of vehicles) {
      const brandName = (vehicle.brand ?? "").trim();
      if (!brandName) continue;

      const slug = toSlug(brandName);
      const current = marcaMap.get(slug);
      if (current) {
        current.count += 1;
      } else {
        marcaMap.set(slug, {
          id: marcaMap.size + 1,
          name: brandName,
          slug,
          count: 1
        });
      }
    }

    return Array.from(marcaMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [vehicles]);

  const modeloOptions = useMemo<SelectOption[]>(() => {
    const modeloMap = new Map<string, SelectOption>();
    const selectedBrandSlug = selectedMarca === "all" ? "" : selectedMarca;

    for (const vehicle of vehicles) {
      const vehicleBrandSlug = toSlug((vehicle.brand ?? "").trim());
      if (selectedBrandSlug && vehicleBrandSlug !== selectedBrandSlug) continue;

      const modelName = (vehicle.model ?? "").trim();
      if (!modelName) continue;

      const slug = toSlug(modelName);
      const current = modeloMap.get(slug);
      if (current) {
        current.count += 1;
      } else {
        modeloMap.set(slug, {
          id: modeloMap.size + 1,
          name: modelName,
          slug,
          count: 1
        });
      }
    }

    return Array.from(modeloMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [selectedMarca, vehicles]);

  const brandItems = useMemo<BrandItem[]>(() => {
    const apiBrands = marcaOptions.map((term) => {
      const slug = term.slug || toSlug(term.name);
      const logo = brandLogoMap[slug] ?? "/images/logo.png";
      return {
        id: `brand-${term.id}`,
        name: term.name.toUpperCase(),
        logo
      };
    });

    const bySlug = new Map<string, BrandItem>();
    for (const brand of [...apiBrands, ...fallbackBrands]) {
      const slug = toSlug(brand.name);
      if (!bySlug.has(slug)) bySlug.set(slug, brand);
    }

    return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [marcaOptions]);

  const priceOptions = useMemo<number[]>(() => {
    const parsedPrices = vehicles
      .map((vehicle: ApiVehicle) => parsePriceValue(vehicle.price ?? ""))
      .filter((value): value is number => typeof value === "number");

    return buildPriceOptions(parsedPrices);
  }, [vehicles]);

  const electricFeaturedVehicles = useMemo<ApiVehicle[]>(() => {
    if (!vehicles.length) return [];

    const electricLike = vehicles.filter(isElectricLikeVehicle);
    const electricIds = new Set(electricLike.map((vehicle) => vehicle.id));
    const fallback = vehicles.filter((vehicle) => !electricIds.has(vehicle.id));

    return [...electricLike, ...fallback].slice(0, 8);
  }, [vehicles]);

  useEffect(() => {
    if (selectedMarca === "all" && selectedModelo !== "all") {
      setSelectedModelo("all");
      return;
    }

    if (selectedModelo !== "all" && !modeloOptions.some((modelo) => (modelo.slug || toSlug(modelo.name)) === selectedModelo)) {
      setSelectedModelo("all");
    }
  }, [selectedMarca, selectedModelo, modeloOptions]);

  useEffect(() => {
    if (!priceOptions.length) {
      if (selectedPrice !== "all") {
        setSelectedPrice("all");
      }
      return;
    }

    if (selectedPrice === "all") {
      const nearTwoHundred = priceOptions.find((value) => value >= 200000) ?? priceOptions[priceOptions.length - 1];
      setSelectedPrice(String(nearTwoHundred));
      return;
    }

    const hasSelected = priceOptions.some((price) => String(price) === selectedPrice);
    if (!hasSelected) {
      setSelectedPrice(String(priceOptions[priceOptions.length - 1]));
    }
  }, [priceOptions, selectedPrice]);

  useEffect(() => {
    if (activeTab !== "descrever") {
      setTypedLength(0);
      setIsDeleting(false);
      setExampleIndex(0);
      return;
    }

    const fullText = aiExamples[exampleIndex] ?? "";
    const reachedEnd = typedLength >= fullText.length;
    const reachedStart = typedLength <= 0;

    let delay = 55;
    if (!isDeleting && reachedEnd) delay = 1200;
    if (isDeleting && reachedStart) delay = 250;
    if (isDeleting && !reachedStart) delay = 28;

    const timer = window.setTimeout(() => {
      if (!isDeleting && reachedEnd) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && reachedStart) {
        setIsDeleting(false);
        setExampleIndex((prev) => (prev + 1) % aiExamples.length);
        return;
      }

      setTypedLength((prev) => prev + (isDeleting ? -1 : 1));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [activeTab, exampleIndex, isDeleting, typedLength]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const updateScrollState = () => {
      const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
      setCanScrollLeft(slider.scrollLeft > 1);
      setCanScrollRight(slider.scrollLeft < maxScrollLeft - 1);
    };

    updateScrollState();
    slider.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      slider.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [activeTab, brandItems.length, cards.length]);

  const placeholderText = activeTab === "descrever" ? `${aiExamples[exampleIndex]?.slice(0, typedLength) ?? ""}${typedLength > 0 ? "..." : ""}` : "";
  const showModelSelect = selectedMarca !== "all";

  const submitVehicleSearch = () => {
    const params = new URLSearchParams();

    let brand = selectedMarca;
    let model = selectedModelo;
    let maxPrice = selectedPrice;
    const trimmedQuery = aiQuery.trim();

    if (trimmedQuery) {
      const querySlug = toSlug(trimmedQuery);
      if (brand === "all") {
        const inferredBrand = marcaOptions.find((item) => querySlug.includes(toSlug(item.name)));
        if (inferredBrand) {
          brand = inferredBrand.slug || toSlug(inferredBrand.name);
        }
      }

      if (model === "all") {
        const inferredModel = modeloOptions.find((item) => querySlug.includes(toSlug(item.name)));
        if (inferredModel) {
          model = inferredModel.slug || toSlug(inferredModel.name);
        }
      }

      if (maxPrice === "all") {
        const inferredPrice = parseLoosePrice(trimmedQuery);
        if (inferredPrice) {
          maxPrice = String(inferredPrice);
        }
      }
    }

    if (brand !== "all") params.set("brand", brand);
    if (brand !== "all" && model !== "all") params.set("model", model);
    if (maxPrice !== "all") params.set("maxPrice", maxPrice);
    params.set("aiMock", "1");
    params.set("aiSeed", String(Date.now()));

    router.push(`/veiculos${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const scrollCards = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    const distance = Math.max(240, Math.floor(sliderRef.current.clientWidth * 0.7));
    sliderRef.current.scrollBy({
      left: direction === "right" ? distance : -distance,
      behavior: "smooth"
    });
  };

  return (
    <section className="container finder">
      <h2>Encontre seu veículo</h2>

      <div className="finder-tabs">
        {tabs.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? "active" : ""} type="button" onClick={() => setActiveTab(tab.key)}>
            {tab.key === "descrever" && <Search size={16} aria-hidden="true" />}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "descrever" ? (
        <article className="describe-panel">
          <div className="describe-panel-top">
            <div className="describe-copy">
              <h3>
                Ainda não encontrou
                <br />
                o <span>carro ideal</span>?
              </h3>
              <p>Faça uma busca personalizada e receba opções exclusivas.</p>
            </div>

            <div className={`describe-controls ${showModelSelect ? "describe-controls--with-model" : "describe-controls--without-model"}`}>
              <label className="describe-select-field">
                <span>Marca</span>
                <select value={selectedMarca} onChange={(event) => setSelectedMarca(event.target.value)}>
                  <option value="all">Todas</option>
                  {marcaOptions.map((marca) => (
                    <option key={marca.id} value={marca.slug || toSlug(marca.name)}>
                      {marca.name}
                    </option>
                  ))}
                </select>
              </label>

              {showModelSelect && (
                <label className="describe-select-field">
                  <span>Modelo</span>
                  <select value={selectedModelo} onChange={(event) => setSelectedModelo(event.target.value)}>
                    <option value="all">Todos</option>
                    {modeloOptions.map((modelo) => (
                      <option key={modelo.id} value={modelo.slug || toSlug(modelo.name)}>
                        {modelo.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="describe-select-field">
                <span>Preço até</span>
                <select value={selectedPrice} onChange={(event) => setSelectedPrice(event.target.value)}>
                  <option value="all">Sem limite</option>
                  {priceOptions.map((price) => (
                    <option key={price} value={String(price)}>
                      {formatPriceValue(price)}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" className="describe-search-btn" onClick={submitVehicleSearch}>
                Buscar veículos
              </button>
            </div>
          </div>

          <div className="describe-ai-row">
            <label className="describe-ai-label" htmlFor="ia-busca">
              Encontrar com IA
            </label>
            <div className="describe-ai-input-wrap">
              <span className="describe-ai-leading" aria-hidden="true">
                <Sparkles size={16} />
              </span>
              <input
                id="ia-busca"
                type="text"
                placeholder={placeholderText || ""}
                value={aiQuery}
                onChange={(event) => setAiQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitVehicleSearch();
                  }
                }}
              />
              <button type="button" className="describe-ai-icon-btn" aria-label="Buscar com IA" onClick={submitVehicleSearch}>
                <Search size={16} />
              </button>
            </div>
          </div>
        </article>
      ) : activeTab === "marca" || activeTab === "categoria" ? (
        <div className={`category-slider-wrap category-slider-wrap--${activeTab}`}>
          <div className="category-slider-nav">
            <button
              type="button"
              className="category-nav-btn category-nav-btn--prev"
              aria-label="Deslizar para a esquerda"
              onClick={() => scrollCards("left")}
              disabled={!canScrollLeft}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="category-nav-btn category-nav-btn--next"
              aria-label="Deslizar para a direita"
              onClick={() => scrollCards("right")}
              disabled={!canScrollRight}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {activeTab === "marca" ? (
            <div className="brand-slider" ref={sliderRef}>
              {brandItems.map((brand) => (
                <article
                  className="brand-card"
                  key={brand.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/veiculos?brand=${toSlug(brand.name)}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/veiculos?brand=${toSlug(brand.name)}`);
                    }
                  }}
                >
                  <div className="brand-logo-wrap">
                    <Image src={brand.logo} alt={brand.name} width={148} height={68} className="brand-logo" />
                  </div>
                  <h3>{brand.name}</h3>
                </article>
              ))}
            </div>
          ) : (
            <div className="category-grid category-grid-visual category-slider" ref={sliderRef}>
              {visualCards.map((card) => {
                const CardIcon = iconMap[card.icon];

                return (
                  <article
                    className={`category-card category-card-visual${card.id.startsWith("view-all") ? " category-card-visual--cta" : ""}`}
                    key={card.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(card.href)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(card.href);
                      }
                    }}
                  >
                    <div className="category-bg" style={{ backgroundImage: `url("${card.bgImage}")` }} />
                    <div className="category-overlay" />

                    <div className="category-meta">
                      <span className="category-meta-icon">
                        <CardIcon size={20} />
                      </span>
                      <div>
                        <h3>{card.title}</h3>
                        <p>{card.amount}</p>
                      </div>
                      <ChevronRight size={17} className="category-meta-arrow" />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "eletricos" ? (
        <div className="offer-grid">
          {!electricFeaturedVehicles.length ? (
            <article className="offer-card empty-state">
              <h3>Sem veículos no momento</h3>
              <p>Assim que o estoque atualizar, os cards aparecerão aqui.</p>
            </article>
          ) : (
            electricFeaturedVehicles.map((vehicle, index) => (
              <VehicleOfferCard
                key={vehicle.id}
                vehicleId={vehicle.id}
                name={vehicle.name}
                subtitle={vehicle.subtitle}
                image={vehicle.image}
                gallery={vehicle.gallery}
                year={vehicle.year}
                transmission={vehicle.transmission}
                fuel={vehicle.fuel}
                km={vehicle.km}
                store={vehicle.store}
                storeId={vehicle.storeId}
                oldPrice={vehicle.oldPrice}
                price={vehicle.price}
                detailUrl={vehicle.url}
                adUrl={vehicle.absoluteUrl}
                qualityTag={vehicle.qualityTag}
                secondaryHighlights={vehicle.secondaryHighlights}
                delay={index * 0.05}
                variant="grid"
              />
            ))
          )}
        </div>
      ) : (
        <div className="category-visual-grid">
          {visualCards.map((card, index) => {
            const CardIcon = iconMap[card.icon];
            const isViewAll = index === visualCards.length - 1;

            return (
              <article
                className={`category-card category-card-visual ${isViewAll ? "category-card-visual--cta" : ""}`}
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(card.href)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(card.href);
                  }
                }}
              >
                <div className="category-bg" style={{ backgroundImage: `url("${card.bgImage}")` }} />
                <div className="category-overlay" />

                <div className="category-meta">
                  <span className="category-meta-icon">
                    <CardIcon size={22} />
                  </span>
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.amount}</p>
                  </div>
                  <span className="category-meta-arrow">
                    <ChevronRight size={18} />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}


