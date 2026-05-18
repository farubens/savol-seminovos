"use client";

import Image from "next/image";
import { Bus, Car, CarFront, ChevronLeft, ChevronRight, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type TabKey = "marca" | "categoria" | "unidade" | "eletricos" | "descrever";
type IconKey = "hatch" | "suv" | "picape" | "sedan" | "esportivo" | "luxo" | "utilitarios";

type CategoryCardItem = {
  id: string;
  title: string;
  amount: string;
  bgImage: string;
  icon: IconKey;
};

type BrandItem = {
  id: string;
  name: string;
  logo: string;
};

type WpTerm = {
  id: number;
  name: string;
  slug?: string;
  count: number;
};

type ApiVehicleFilterItem = {
  price?: string;
};

type ApiVehicleFilterResponse = {
  items?: ApiVehicleFilterItem[];
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "marca", label: "Marca" },
  { key: "categoria", label: "Categoria" },
  { key: "unidade", label: "Unidade" },
  { key: "eletricos", label: "Elétricos" },
  { key: "descrever", label: "Descrever veículo" }
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

const marcaApiUrl = "https://palevioletred-lark-270684.hostingersite.com/wp-json/wp/v2/veiculo_marca?per_page=100&hide_empty=true";
const modeloApiUrl = "https://palevioletred-lark-270684.hostingersite.com/wp-json/wp/v2/veiculo_modelo?per_page=100&hide_empty=true";
const filterPriceApiUrl = "/api/veiculos?per_page=24";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unsplashDownload(id: string): string {
  return `https://unsplash.com/photos/${id}/download?force=true&w=1200&q=80`;
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

const bg = {
  hatch: unsplashDownload("IGNiRQWxXLM"),
  suv: unsplashDownload("dlHeeP3iQIo"),
  picape: unsplashDownload("BYuybywqdD0"),
  sedan: unsplashDownload("LF4FiHABjE4"),
  esportivo: unsplashDownload("Zcb5UlIihQY"),
  luxo: unsplashDownload("vr9e_sGANOg"),
  utilitarios: unsplashDownload("XGJBSkoqX_I")
};

const iconMap = {
  hatch: CarFront,
  suv: Car,
  picape: Truck,
  sedan: CarFront,
  esportivo: Car,
  luxo: ShieldCheck,
  utilitarios: Bus
};

const cardsByTab: Record<Exclude<TabKey, "descrever" | "marca">, CategoryCardItem[]> = {
  categoria: [
    { id: "hatch-c", title: "Compactos", amount: "210 veículos", bgImage: bg.hatch, icon: "hatch" },
    { id: "suv-c", title: "SUV", amount: "512 veículos", bgImage: bg.suv, icon: "suv" },
    { id: "picape-c", title: "4x4", amount: "133 veículos", bgImage: bg.picape, icon: "picape" },
    { id: "sedan-c", title: "Executivos", amount: "142 veículos", bgImage: bg.sedan, icon: "sedan" },
    { id: "esp-c", title: "Performance", amount: "32 veículos", bgImage: bg.esportivo, icon: "esportivo" },
    { id: "lux-c", title: "Premium", amount: "67 veículos", bgImage: bg.luxo, icon: "luxo" },
    { id: "uti-c", title: "Furgões", amount: "88 veículos", bgImage: bg.utilitarios, icon: "utilitarios" }
  ],
  unidade: [
    { id: "hatch-u", title: "São Paulo", amount: "174 veículos", bgImage: bg.hatch, icon: "hatch" },
    { id: "suv-u", title: "Santo André", amount: "201 veículos", bgImage: bg.suv, icon: "suv" },
    { id: "picape-u", title: "São Caetano", amount: "154 veículos", bgImage: bg.picape, icon: "picape" },
    { id: "sedan-u", title: "ABC Paulista", amount: "173 veículos", bgImage: bg.sedan, icon: "sedan" },
    { id: "esp-u", title: "Guarulhos", amount: "95 veículos", bgImage: bg.esportivo, icon: "esportivo" },
    { id: "lux-u", title: "Premium Store", amount: "67 veículos", bgImage: bg.luxo, icon: "luxo" },
    { id: "uti-u", title: "Matriz Savol", amount: "141 veículos", bgImage: bg.utilitarios, icon: "utilitarios" }
  ],
  eletricos: [
    { id: "hatch-e", title: "Hatch elétrico", amount: "56 veículos", bgImage: bg.hatch, icon: "hatch" },
    { id: "suv-e", title: "SUV elétrico", amount: "81 veículos", bgImage: bg.suv, icon: "suv" },
    { id: "picape-e", title: "Picape híbrida", amount: "34 veículos", bgImage: bg.picape, icon: "picape" },
    { id: "sedan-e", title: "Sedan elétrico", amount: "65 veículos", bgImage: bg.sedan, icon: "sedan" },
    { id: "esp-e", title: "Sport EV", amount: "18 veículos", bgImage: bg.esportivo, icon: "esportivo" },
    { id: "lux-e", title: "Luxo EV", amount: "27 veículos", bgImage: bg.luxo, icon: "luxo" },
    { id: "uti-e", title: "Utilitário EV", amount: "22 veículos", bgImage: bg.utilitarios, icon: "utilitarios" }
  ]
};

export function CategoryFinder() {
  const [activeTab, setActiveTab] = useState<TabKey>("marca");
  const [brandItems, setBrandItems] = useState<BrandItem[]>(fallbackBrands);
  const [marcaOptions, setMarcaOptions] = useState<WpTerm[]>([]);
  const [modeloOptions, setModeloOptions] = useState<WpTerm[]>([]);
  const [priceOptions, setPriceOptions] = useState<number[]>([]);
  const [selectedMarca, setSelectedMarca] = useState("all");
  const [selectedModelo, setSelectedModelo] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const cards = useMemo(() => {
    return activeTab === "categoria" || activeTab === "unidade" || activeTab === "eletricos" ? cardsByTab[activeTab] : [];
  }, [activeTab]);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch(marcaApiUrl, { signal: controller.signal }).then((response) => (response.ok ? response.json() : [])),
      fetch(modeloApiUrl, { signal: controller.signal }).then((response) => (response.ok ? response.json() : [])),
      fetch(filterPriceApiUrl, { signal: controller.signal }).then((response) =>
        response.ok ? response.json() : ({ items: [] } as ApiVehicleFilterResponse)
      )
    ])
      .then(([marcaJson, modeloJson, vehicleJson]) => {
        const marcas = (marcaJson as WpTerm[]).filter((term) => term.count > 0);
        const modelos = (modeloJson as WpTerm[]).filter((term) => term.count > 0);
        setMarcaOptions(marcas);
        setModeloOptions(modelos);

        if (marcas.length) {
          const mappedBrands = marcas.map((term) => {
            const slug = term.slug || toSlug(term.name);
            const logo = brandLogoMap[slug] ?? "/images/logo.png";
            return {
              id: `brand-${term.id}`,
              name: term.name,
              logo
            } satisfies BrandItem;
          });
          setBrandItems(mappedBrands);
        }

        const items = Array.isArray((vehicleJson as ApiVehicleFilterResponse).items)
          ? ((vehicleJson as ApiVehicleFilterResponse).items as ApiVehicleFilterItem[])
          : [];

        const parsedPrices = items
          .map((item) => parsePriceValue(item.price ?? ""))
          .filter((value): value is number => typeof value === "number");

        const generatedPrices = buildPriceOptions(parsedPrices);
        setPriceOptions(generatedPrices);

        if (generatedPrices.length) {
          const nearTwoHundred = generatedPrices.find((value) => value >= 200000) ?? generatedPrices[generatedPrices.length - 1];
          setSelectedPrice(String(nearTwoHundred));
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (selectedMarca === "all" && selectedModelo !== "all") {
      setSelectedModelo("all");
    }
  }, [selectedMarca, selectedModelo]);

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

  const placeholderText = activeTab === "descrever" ? `${aiExamples[exampleIndex]?.slice(0, typedLength) ?? ""}${typedLength > 0 ? "..." : ""}` : "";
  const showModelSelect = selectedMarca !== "all";

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

              <button type="button" className="describe-search-btn">
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
              <input id="ia-busca" type="text" placeholder={placeholderText || ""} />
              <button type="button" className="describe-ai-icon-btn" aria-label="Buscar com IA">
                <Search size={16} />
              </button>
            </div>
          </div>
        </article>
      ) : (
        <div className="category-slider-wrap">
          <button type="button" className="category-nav-btn" aria-label="Deslizar para a esquerda" onClick={() => scrollCards("left")}>
            <ChevronLeft size={18} />
          </button>

          {activeTab === "marca" ? (
            <div className="brand-slider" ref={sliderRef}>
              {brandItems.map((brand) => (
                <article className="brand-card" key={brand.id}>
                  <div className="brand-logo-wrap">
                    <Image src={brand.logo} alt={brand.name} width={148} height={68} className="brand-logo" />
                  </div>
                  <h3>{brand.name}</h3>
                </article>
              ))}
            </div>
          ) : (
            <div className="category-grid category-grid-visual category-slider" ref={sliderRef}>
              {cards.map((card) => {
                const CardIcon = iconMap[card.icon];

                return (
                  <article className="category-card category-card-visual" key={card.id}>
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

          <button type="button" className="category-nav-btn" aria-label="Deslizar para a direita" onClick={() => scrollCards("right")}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}


