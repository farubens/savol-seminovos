"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Navigation, PhoneCall, Search } from "lucide-react";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";
import { MapDirectionsModal } from "@/components/MapDirectionsModal";
import { StoreDetailsModal } from "@/components/StoreDetailsModal";
import type { ApiStore } from "@/types/home";
import type { StoreMapPoint } from "@/components/StoresLeafletMap";

const StoresLeafletMap = dynamic(() => import("@/components/StoresLeafletMap").then((mod) => mod.StoresLeafletMap), {
  ssr: false,
  loading: () => <div className="stores-map-loading">Carregando mapa interativo...</div>
});

type GeoPoint = { lat: number; lng: number };
type StoreWithGeo = ApiStore & GeoPoint;

const DEFAULT_REFERENCE_POINT: GeoPoint = { lat: -23.6639, lng: -46.5383 };

const GEO_HINTS: Array<{ keys: string[]; point: GeoPoint }> = [
  { keys: ["praia-grande"], point: { lat: -24.0084, lng: -46.4127 } },
  { keys: ["maua"], point: { lat: -23.6688, lng: -46.4617 } },
  { keys: ["ipiranga", "sao-paulo"], point: { lat: -23.5864, lng: -46.6096 } },
  { keys: ["sao-caetano", "sao-caetano-do-sul"], point: { lat: -23.6232, lng: -46.5548 } },
  { keys: ["sao-bernardo", "sao-bernardo-do-campo"], point: { lat: -23.6914, lng: -46.5646 } },
  { keys: ["santo-andre"], point: { lat: -23.6639, lng: -46.5383 } }
];

function normalizeCep(value: string): string {
  return value.replace(/[^\d]/g, "").slice(0, 8);
}

function formatCep(value: string): string {
  const digits = normalizeCep(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceInKm(from: GeoPoint, to: GeoPoint): number {
  const earthRadiusKm = 6371;
  const latDiff = degToRad(to.lat - from.lat);
  const lngDiff = degToRad(to.lng - from.lng);
  const haversine =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(degToRad(from.lat)) * Math.cos(degToRad(to.lat)) * Math.sin(lngDiff / 2) * Math.sin(lngDiff / 2);
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * centralAngle;
}

function formatDistance(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value)} km`;
}

function resolveStorePoint(store: ApiStore): GeoPoint {
  const haystack = `${store.slug} ${store.name} ${store.address}`;
  const normalized = normalizeText(haystack);

  for (const hint of GEO_HINTS) {
    if (hint.keys.some((key) => normalized.includes(key))) {
      return hint.point;
    }
  }

  return DEFAULT_REFERENCE_POINT;
}

function spreadOverlappingPoints(stores: StoreWithGeo[]): StoreWithGeo[] {
  const seen = new Map<string, number>();
  return stores.map((store) => {
    const key = `${store.lat.toFixed(3)}_${store.lng.toFixed(3)}`;
    const occurrence = seen.get(key) ?? 0;
    seen.set(key, occurrence + 1);

    if (occurrence === 0) return store;

    const ring = Math.floor((occurrence - 1) / 8) + 1;
    const angle = ((occurrence - 1) % 8) * (Math.PI / 4);
    const offset = 0.0042 * ring;

    return {
      ...store,
      lat: store.lat + Math.cos(angle) * offset,
      lng: store.lng + Math.sin(angle) * offset
    };
  });
}

export function StoreDirectory() {
  const { stores, loading } = useHomeSessionData();
  const [query, setQuery] = useState("");
  const [cep, setCep] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [storeModal, setStoreModal] = useState<ApiStore | null>(null);
  const [routeModalStore, setRouteModalStore] = useState<ApiStore | null>(null);
  const [userPoint, setUserPoint] = useState<GeoPoint | null>(null);
  const storesListRef = useRef<HTMLDivElement | null>(null);
  const storeCardRefs = useRef(new Map<number, HTMLElement>());
  const skipAutoScrollRef = useRef(false);

  const requestUserLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("Seu navegador não suporta geolocalização.");
      return;
    }
    setLocationStatus("Solicitando sua localização...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPoint({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationStatus("Localização aplicada. Lojas ordenadas por proximidade.");
      },
      () => {
        setLocationStatus("Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const applyCepLocation = async () => {
    const sanitizedCep = normalizeCep(cep);
    if (sanitizedCep.length !== 8) {
      setLocationStatus("Informe um CEP válido com 8 dígitos.");
      return;
    }

    setLocationStatus("Localizando CEP...");
    try {
      const cepResponse = await fetch(`https://viacep.com.br/ws/${sanitizedCep}/json/`, { cache: "no-store" });
      const cepPayload = (await cepResponse.json()) as { erro?: boolean; logradouro?: string; localidade?: string; uf?: string };
      if (!cepResponse.ok || cepPayload?.erro) {
        setLocationStatus("CEP não encontrado.");
        return;
      }

      const queryAddress = [cepPayload.logradouro, cepPayload.localidade, cepPayload.uf, "Brasil"].filter(Boolean).join(", ");
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(queryAddress)}`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store"
        }
      );
      const geoPayload = (await geoResponse.json()) as Array<{ lat: string; lon: string }>;
      const first = geoPayload?.[0];
      if (!geoResponse.ok || !first) {
        setLocationStatus("Não foi possível localizar esse CEP no mapa.");
        return;
      }

      setUserPoint({ lat: Number(first.lat), lng: Number(first.lon) });
      setLocationStatus("CEP aplicado. Lojas ordenadas por proximidade.");
    } catch {
      setLocationStatus("Falha ao consultar o CEP. Tente novamente.");
    }
  };

  const storesWithGeo = useMemo<StoreWithGeo[]>(() => {
    const positioned = stores.map((store) => {
      const point = resolveStorePoint(store);
      return { ...store, ...point };
    });
    return spreadOverlappingPoints(positioned);
  }, [stores]);

  const filteredStores = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const reference = userPoint ?? DEFAULT_REFERENCE_POINT;

    return storesWithGeo
      .filter((store) => {
        if (!normalizedQuery) return true;
        const content = normalizeText(`${store.name} ${store.address} ${store.brand}`);
        return content.includes(normalizedQuery);
      })
      .map((store) => ({
        ...store,
        distanceKm: distanceInKm(reference, { lat: store.lat, lng: store.lng })
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [query, storesWithGeo, userPoint]);
  const handleFindNearestStore = async () => {
    skipAutoScrollRef.current = true;
    const sanitizedCep = normalizeCep(cep);
    if (sanitizedCep.length === 8) {
      await applyCepLocation();
      return;
    }
    requestUserLocation();
  };

  useEffect(() => {
    requestUserLocation();
  }, []);

  useEffect(() => {
    if (!filteredStores.length) {
      setSelectedStoreId(null);
      return;
    }
    const stillExists = filteredStores.some((store) => store.id === selectedStoreId);
    if (!stillExists) {
      setSelectedStoreId(filteredStores[0].id);
    }
  }, [filteredStores, selectedStoreId]);

  useEffect(() => {
    if (selectedStoreId == null || isSidebarCollapsed) return;
    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      return;
    }

    let timerId: number | null = null;
    const rafId = window.requestAnimationFrame(() => {
      timerId = window.setTimeout(() => {
        const list = storesListRef.current;
        const card = storeCardRefs.current.get(selectedStoreId);
        if (!list || !card) return;

        const listRect = list.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const isAbove = cardRect.top < listRect.top;
        const isBelow = cardRect.bottom > listRect.bottom;

        if (isAbove || isBelow) {
          card.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
          });
        }
      }, 120);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, [filteredStores, isSidebarCollapsed, selectedStoreId]);

  const selectedStore = useMemo(
    () => filteredStores.find((store) => store.id === selectedStoreId) ?? null,
    [filteredStores, selectedStoreId]
  );

  const mapPoints = useMemo<StoreMapPoint[]>(
    () =>
      filteredStores.map((store) => ({
        id: store.id,
        name: store.name,
        brand: store.brand,
        lat: store.lat,
        lng: store.lng
      })),
    [filteredStores]
  );

  const handleStorePinSelect = (storeId: number) => {
    setSelectedStoreId(storeId);
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }
  };

  return (
    <section className="container stores-directory">
      <header className="stores-directory-head">
        <h1>Nossas lojas</h1>
        <p>
          {loading
            ? "Carregando unidades..."
            : `${filteredStores.length} ${filteredStores.length === 1 ? "unidade disponível" : "unidades disponíveis"}`}
        </p>
      </header>

      <div className={`stores-directory-layout ${isSidebarCollapsed ? "is-sidebar-collapsed" : ""}`}>
        <aside className={`stores-directory-sidebar ${isSidebarCollapsed ? "is-collapsed" : ""}`}>
          <div className="stores-directory-toolbar">
            <label className="stores-search-input" htmlFor="stores-cep">
              <MapPin size={19} />
              <input
                id="stores-cep"
                type="text"
                inputMode="numeric"
                placeholder="Insira seu CEP"
                value={formatCep(cep)}
                maxLength={9}
                onChange={(event) => setCep(normalizeCep(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleFindNearestStore();
                  }
                }}
              />
            </label>

            <button type="button" className="stores-filter-input" aria-label="Buscar loja mais próxima" onClick={() => void handleFindNearestStore()}>
              <Search size={17} />
              <span>Buscar</span>
            </button>
          </div>

          {locationStatus ? <p className="stores-location-status">{locationStatus}</p> : null}

          <div className="stores-directory-list" ref={storesListRef}>
            {!loading && filteredStores.length === 0 && (
              <article className="stores-directory-empty">
                <h3>Sem resultados</h3>
                <p>Tente outro termo de busca ou remova os filtros.</p>
              </article>
            )}

            {!loading &&
              filteredStores.map((store) => {
                const isActive = selectedStore?.id === store.id;
                return (
                  <article
                    key={store.id}
                    ref={(node) => {
                      if (node) {
                        storeCardRefs.current.set(store.id, node);
                      } else {
                        storeCardRefs.current.delete(store.id);
                      }
                    }}
                    className={`stores-directory-card ${isActive ? "is-active" : ""}`}
                    onMouseEnter={() => setSelectedStoreId(store.id)}
                    onClick={() => setSelectedStoreId(store.id)}
                  >
                    <div className="stores-card-top">
                      <span className="stores-card-brand">{store.brand}</span>
                      <span className="stores-card-distance">{formatDistance(store.distanceKm)}</span>
                    </div>
                    <h3>{store.name}</h3>
                    <p className="stores-card-detail">
                      <MapPin size={16} /> {store.address}
                    </p>
                    <p className="stores-card-detail">
                      <PhoneCall size={16} /> {store.phone}
                    </p>
                    <p className="stores-card-count">{store.vehiclesCount} veículos</p>
                    <div className="stores-card-actions">
                      <button
                        type="button"
                        className="store-btn-primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setStoreModal(store);
                        }}
                      >
                        Ver loja
                      </button>
                      <button
                        type="button"
                        className="store-btn-ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          setRouteModalStore(store);
                        }}
                      >
                        <Navigation size={14} /> Como chegar
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
        </aside>

        <div className="stores-directory-map-wrap">
          <button
            type="button"
            className="stores-collapse-btn"
            aria-label={isSidebarCollapsed ? "Mostrar lista de lojas" : "Ocultar lista de lojas"}
            onClick={() => setIsSidebarCollapsed((value) => !value)}
          >
            {isSidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>

          <StoresLeafletMap
            stores={mapPoints}
            selectedStoreId={selectedStoreId}
            layoutSignal={isSidebarCollapsed ? "collapsed" : "expanded"}
            onSelectStore={handleStorePinSelect}
          />
        </div>
      </div>

      <MapDirectionsModal
        open={Boolean(routeModalStore)}
        storeName={routeModalStore?.name ?? ""}
        address={routeModalStore?.address ?? ""}
        onClose={() => setRouteModalStore(null)}
      />

      <StoreDetailsModal
        open={Boolean(storeModal)}
        store={storeModal}
        onClose={() => setStoreModal(null)}
        onOpenDirections={(store) => {
          setStoreModal(null);
          setRouteModalStore(store);
        }}
      />
    </section>
  );
}




