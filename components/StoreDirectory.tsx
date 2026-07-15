"use client";

import dynamic from "next/dynamic";
import { type UIEvent, useEffect, useMemo, useRef, useState } from "react";
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
type LocationSuggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  cep?: string;
};

type KnownLocation = {
  label: string;
  point: GeoPoint;
  aliases: string[];
};

const EXACT_LOCATION_ALIASES: Record<string, string> = {
  scs: "sao caetano do sul",
  sbc: "sao bernardo do campo",
  sa: "santo andre",
  sc: "santa catarina",
  rj: "rio de janeiro",
  sp: "sao paulo",
  bsb: "brasilia"
};

const DEFAULT_REFERENCE_POINT: GeoPoint = { lat: -23.6639, lng: -46.5383 };

const KNOWN_LOCATIONS: KnownLocation[] = [
  {
    label: "São Bernardo do Campo - SP",
    point: { lat: -23.6914, lng: -46.5646 },
    aliases: ["sbc", "s b c", "sao bernardo", "sao bernardo do campo", "s bernardo", "bernardo do campo"]
  },
  {
    label: "Santo André - SP",
    point: { lat: -23.6639, lng: -46.5383 },
    aliases: ["sa", "santo andre", "santo and", "sto andre", "s andre"]
  },
  {
    label: "São Caetano do Sul - SP",
    point: { lat: -23.6232, lng: -46.5548 },
    aliases: ["scs", "s c s", "sao caetano", "sao caetano do sul", "s caetano", "caetano do sul"]
  },
  {
    label: "São Paulo - SP",
    point: { lat: -23.5505, lng: -46.6333 },
    aliases: ["sp", "sao paulo", "sampa", "capital sp"]
  },
  {
    label: "Rio de Janeiro - RJ",
    point: { lat: -22.9068, lng: -43.1729 },
    aliases: ["rj", "rio de janeiro", "rio"]
  },
  {
    label: "Santa Catarina - SC",
    point: { lat: -27.2423, lng: -50.2189 },
    aliases: ["sc", "santa catarina"]
  },
  {
    label: "Campinas - SP",
    point: { lat: -22.9056, lng: -47.0608 },
    aliases: ["campinas"]
  },
  {
    label: "Campina Grande - PB",
    point: { lat: -7.2291, lng: -35.8808 },
    aliases: ["campina grande"]
  },
  {
    label: "Campo Grande - MS",
    point: { lat: -20.4697, lng: -54.6201 },
    aliases: ["campo grande", "cg", "ms"]
  },
  {
    label: "Mauá - SP",
    point: { lat: -23.6688, lng: -46.4617 },
    aliases: ["maua"]
  },
  {
    label: "Praia Grande - SP",
    point: { lat: -24.0084, lng: -46.4127 },
    aliases: ["praia grande"]
  }
];

const GEO_HINTS: Array<{ keys: string[]; point: GeoPoint }> = [
  { keys: ["praia-grande"], point: { lat: -24.0084, lng: -46.4127 } },
  { keys: ["maua"], point: { lat: -23.6688, lng: -46.4617 } },
  { keys: ["campinas"], point: { lat: -22.9056, lng: -47.0608 } },
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

function isCepLike(value: string): boolean {
  return normalizeCep(value).length >= 5;
}

function extractCepFromAddress(value: string): string {
  const match = value.match(/\b\d{5}-?\d{3}\b/);
  return match ? normalizeCep(match[0]) : "";
}

function extractAddressParts(value: string): { street: string; district: string; cityUf: string; cep: string } {
  const clean = value.replace(/\s+/g, " ").trim();
  const cep = extractCepFromAddress(clean);
  const noCep = clean.replace(/\s*,?\s*\d{5}-?\d{3}\s*$/, "").trim();
  const [street = "", district = "", cityUf = ""] = noCep.split(",").map((part) => part.trim());
  return { street, district, cityUf, cep };
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeForMatch(value: string): string {
  return normalizeText(value).replace(/-/g, " ");
}

function expandLocationAliases(value: string): string {
  let expanded = value;
  const replacements: Array<[RegExp, string]> = [
    [/\bscs\b/g, "sao caetano do sul"],
    [/\bsbc\b/g, "sao bernardo do campo"],
    [/\bsa\b/g, "santo andre"],
    [/\bbh\b/g, "belo horizonte"],
    [/\bpoa\b/g, "porto alegre"],
    [/\bbsb\b/g, "brasilia"],
    [/\bcampinas\b/g, "campinas"],
    [/\brj\b/g, "rio de janeiro"],
    [/\bsp\b/g, "sao paulo"],
    [/\bmg\b/g, "minas gerais"],
    [/\bes\b/g, "espirito santo"],
    [/\bpr\b/g, "parana"],
    [/\bsc\b/g, "santa catarina"],
    [/\brs\b/g, "rio grande do sul"],
    [/\bms\b/g, "mato grosso do sul"],
    [/\bmt\b/g, "mato grosso"],
    [/\bgo\b/g, "goias"],
    [/\bba\b/g, "bahia"],
    [/\bpe\b/g, "pernambuco"],
    [/\bce\b/g, "ceara"],
    [/\bpb\b/g, "paraiba"],
    [/\brn\b/g, "rio grande do norte"],
    [/\bal\b/g, "alagoas"],
    [/\bse\b/g, "sergipe"],
    [/\bpi\b/g, "piaui"],
    [/\bma\b/g, "maranhao"],
    [/\bpa\b/g, "para"],
    [/\bam\b/g, "amazonas"],
    [/\bro\b/g, "rondonia"],
    [/\bac\b/g, "acre"],
    [/\brr\b/g, "roraima"],
    [/\bap\b/g, "amapa"],
    [/\bto\b/g, "tocantins"],
    [/\bdf\b/g, "distrito federal"]
  ];
  for (const [pattern, replacement] of replacements) {
    expanded = expanded.replace(pattern, `${replacement} ${expanded}`);
  }
  return expanded;
}

const STATE_UF_BY_NAME: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  espirito_santo: "ES",
  goias: "GO",
  maranhao: "MA",
  mato_grosso: "MT",
  mato_grosso_do_sul: "MS",
  minas_gerais: "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  rio_de_janeiro: "RJ",
  rio_grande_do_norte: "RN",
  rio_grande_do_sul: "RS",
  rondonia: "RO",
  roraima: "RR",
  santa_catarina: "SC",
  sao_paulo: "SP",
  sergipe: "SE",
  tocantins: "TO"
};

function toUf(value: string): string {
  const compact = normalizeForMatch(value).replace(/\s+/g, "_");
  return STATE_UF_BY_NAME[compact] ?? value;
}

function tokens(value: string): string[] {
  return normalizeForMatch(value)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function looksLikeAddressQuery(value: string): boolean {
  const normalized = normalizeForMatch(value);
  return /\b(rua|r|avenida|av|alameda|travessa|tv|estrada|rodovia|rod|praca|pc)\b/.test(normalized);
}

function matchTokenScore(haystack: string, terms: string[]): number {
  if (!terms.length) return 0;
  let matches = 0;
  for (const term of terms) {
    if (haystack.includes(term)) matches += 1;
  }
  return matches / terms.length;
}

function acronymOf(value: string): string {
  return normalizeForMatch(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function resolveExactAlias(value: string): string {
  const key = value.trim().toLowerCase();
  return EXACT_LOCATION_ALIASES[key] ?? "";
}

function fuzzyScore(haystack: string, needle: string): number {
  const a = normalizeForMatch(haystack).replace(/\s+/g, "");
  const b = normalizeForMatch(needle).replace(/\s+/g, "");
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 1;

  const uniqueNeedle = Array.from(new Set(b.split("")));
  let hits = 0;
  for (const ch of uniqueNeedle) {
    if (a.includes(ch)) hits += 1;
  }
  return hits / Math.max(uniqueNeedle.length, 1);
}

function locationMatchScore(location: KnownLocation, rawInput: string): number {
  const input = normalizeForMatch(rawInput);
  const compactInput = input.replace(/\s+/g, "");
  if (!input) return 0;

  const candidates = [location.label, ...location.aliases];
  let best = 0;
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeForMatch(candidate);
    const compactCandidate = normalizedCandidate.replace(/\s+/g, "");
    const acronym = acronymOf(candidate).toLowerCase();
    if (compactCandidate === compactInput || acronym === compactInput) best = Math.max(best, 1);
    if (compactInput.length >= 2 && acronym.startsWith(compactInput)) best = Math.max(best, 0.9);
    if (compactCandidate.startsWith(compactInput) || compactCandidate.includes(compactInput)) best = Math.max(best, 0.92);
    if (compactInput.length > 3) {
      best = Math.max(best, fuzzyScore(candidate, rawInput), matchTokenScore(normalizedCandidate, tokens(rawInput)));
    }
  }
  return best;
}

function getKnownLocationSuggestions(rawInput: string): LocationSuggestion[] {
  return KNOWN_LOCATIONS
    .map((location) => ({ location, score: locationMatchScore(location, rawInput) }))
    .filter((entry) => entry.score >= 0.4)
    .sort((a, b) => b.score - a.score)
    .map(({ location }) => ({
      id: `known-${normalizeText(location.label)}`,
      label: location.label,
      lat: location.point.lat,
      lng: location.point.lng
    }));
}

function findBestKnownLocation(rawInput: string): LocationSuggestion | null {
  return getKnownLocationSuggestions(rawInput)[0] ?? null;
}

async function reverseGeocode(point: GeoPoint): Promise<{ label: string; cep: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${point.lat}&lon=${point.lng}`;
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) {
    return { label: "", cep: "" };
  }
  const payload = (await response.json()) as {
    address?: {
      road?: string;
      suburb?: string;
      city?: string;
      town?: string;
      state?: string;
      postcode?: string;
    };
  };
  const road = payload.address?.road ?? "";
  const suburb = payload.address?.suburb ?? "";
  const city = payload.address?.city ?? payload.address?.town ?? "";
  const state = payload.address?.state ?? "";
  const cep = normalizeCep(payload.address?.postcode ?? "");
  const label = [road, suburb, city && state ? `${city} - ${state}` : city || state, cep ? formatCep(cep) : ""]
    .filter(Boolean)
    .join(", ");
  return { label, cep };
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
  const [locationInput, setLocationInput] = useState("");
  const [selectedCep, setSelectedCep] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [storeModal, setStoreModal] = useState<ApiStore | null>(null);
  const [routeModalStore, setRouteModalStore] = useState<ApiStore | null>(null);
  const [userPoint, setUserPoint] = useState<GeoPoint | null>(null);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [cepSuggestion, setCepSuggestion] = useState<LocationSuggestion | null>(null);
  const storesListRef = useRef<HTMLDivElement | null>(null);
  const storeCardRefs = useRef(new Map<number, HTMLElement>());
  const skipAutoScrollRef = useRef(false);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  const requestUserLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("Seu navegador não suporta geolocalização.");
      return;
    }
    setLocationStatus("Solicitando sua localização...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setUserPoint({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        try {
          const point = { lat: position.coords.latitude, lng: position.coords.longitude };
          const resolved = await reverseGeocode(point);
          if (resolved.label) {
            setLocationInput(resolved.label);
            setSelectedCep(resolved.cep);
          }
        } catch {
          // silencioso: mantém apenas ordenação por coordenada
        }
        setLocationStatus("Localização aplicada. Lojas ordenadas por proximidade.");
      },
      () => {
        setLocationStatus("Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const applyCepLocation = async (rawInput?: string) => {
    const sanitizedCep = normalizeCep(rawInput ?? locationInput ?? selectedCep);
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
      setSelectedCep(sanitizedCep);
      setLocationStatus("CEP aplicado. Lojas ordenadas por proximidade.");
    } catch {
      setLocationStatus("Falha ao consultar o CEP. Tente novamente.");
    }
  };

  const applyTextLocation = async (rawInput: string) => {
    const knownLocation = findBestKnownLocation(rawInput);
    if (knownLocation) {
      setLocationInput(knownLocation.label);
      setUserPoint({ lat: knownLocation.lat, lng: knownLocation.lng });
      setSelectedCep("");
      setLocationStatus("Local aplicado. Lojas ordenadas por proximidade.");
      return;
    }

    const normalized = normalizeForMatch(expandLocationAliases(rawInput.toLowerCase()));
    if (normalized.length < 3) {
      setLocationStatus("Digite pelo menos 3 caracteres para buscar local.");
      return;
    }
    setLocationStatus("Localizando endereço...");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=br&q=${encodeURIComponent(`${rawInput}, Brasil`)}`;
      const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
      const payload = (await response.json()) as Array<{ lat: string; lon: string }>;
      const first = payload?.[0];
      if (!response.ok || !first) {
        setLocationStatus("Não foi possível localizar esse endereço.");
        return;
      }
      setUserPoint({ lat: Number(first.lat), lng: Number(first.lon) });
      setSelectedCep("");
      setLocationStatus("Local aplicado. Lojas ordenadas por proximidade.");
    } catch {
      setLocationStatus("Falha ao consultar o endereço. Tente novamente.");
    }
  };

  const storesWithGeo = useMemo<StoreWithGeo[]>(() => {
    const positioned = stores.map((store) => {
      const point = resolveStorePoint(store);
      return { ...store, ...point };
    });
    return spreadOverlappingPoints(positioned);
  }, [stores]);

  const localSuggestions = useMemo<LocationSuggestion[]>(() => {
    const seen = new Set<string>();
    const list: LocationSuggestion[] = [];
    for (const store of storesWithGeo) {
      const parts = extractAddressParts(store.address);
      const label = [parts.street, parts.district, parts.cityUf, parts.cep].filter(Boolean).join(", ");
      if (!label) continue;
      const key = normalizeText(label);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        id: `store-${store.id}`,
        label,
        lat: store.lat,
        lng: store.lng,
        cep: parts.cep
      });
    }
    return list;
  }, [storesWithGeo]);

  const filteredStores = useMemo(() => {
    const reference = userPoint ?? DEFAULT_REFERENCE_POINT;
    const cepFilter = normalizeCep(selectedCep || locationInput);

    return storesWithGeo
      .map((store) => {
        const storeCep = extractCepFromAddress(store.address);
        const matchesCep = cepFilter.length === 8 && storeCep === cepFilter;
        return {
          ...store,
          distanceKm: matchesCep ? 0 : distanceInKm(reference, { lat: store.lat, lng: store.lng })
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [storesWithGeo, userPoint, selectedCep, locationInput]);

  useEffect(() => {
    const input = locationInput.trim();
    if (input.length < 2) {
      setSuggestions([]);
      setCepSuggestion(null);
      return;
    }

    const expandedRaw = expandLocationAliases(input.toLowerCase());
    const expanded = normalizeForMatch(expandedRaw);
    const exactAlias = resolveExactAlias(input);
    const aliasExpanded = exactAlias ? normalizeForMatch(exactAlias) : "";
    const known = getKnownLocationSuggestions(input).slice(0, 6);
    const local = localSuggestions
      .map((item) => ({ item, score: Math.max(fuzzyScore(item.label, expanded), fuzzyScore(item.label, input)) }))
      .filter((entry) => entry.score >= 0.4)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item)
      .slice(0, 6);
    const typedPoint =
      known[0] ? { lat: known[0].lat, lng: known[0].lng } : GEO_HINTS.find((hint) => hint.keys.some((key) => normalizeText(expanded).includes(key)))?.point ?? DEFAULT_REFERENCE_POINT;
    const typedSuggestion: LocationSuggestion = {
      id: `typed-${normalizeText(input)}`,
      label: exactAlias ? exactAlias.replace(/\b\w/g, (char) => char.toUpperCase()) : input,
      lat: typedPoint.lat,
      lng: typedPoint.lng
    };

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsFetchingSuggestions(true);
        let cepSuggestionCandidate: LocationSuggestion | null = null;
        const cepDigits = normalizeCep(input);
        if (isCepLike(input) && cepDigits.length === 8) {
          const cepResponse = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, { cache: "no-store", signal: controller.signal });
          const cepPayload = (await cepResponse.json()) as {
            erro?: boolean;
            logradouro?: string;
            bairro?: string;
            localidade?: string;
            uf?: string;
          };
          if (cepResponse.ok && !cepPayload?.erro) {
            const label = [cepPayload.logradouro, cepPayload.bairro, cepPayload.localidade && cepPayload.uf ? `${cepPayload.localidade} - ${cepPayload.uf}` : cepPayload.localidade, formatCep(cepDigits)]
              .filter(Boolean)
              .join(", ");
            const queryAddress = [cepPayload.logradouro, cepPayload.localidade, cepPayload.uf, "Brasil"].filter(Boolean).join(", ");
            const geoResponse = await fetch(
              `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(queryAddress)}`,
              { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal }
            );
            const geoPayload = (await geoResponse.json()) as Array<{ lat: string; lon: string }>;
            const first = geoPayload?.[0];
            if (geoResponse.ok && first) {
              cepSuggestionCandidate = {
                id: `cep-${cepDigits}`,
                label,
                lat: Number(first.lat),
                lng: Number(first.lon),
                cep: cepDigits
              };
              setCepSuggestion(cepSuggestionCandidate);
            }
          }
        } else {
          setCepSuggestion(null);
        }

        const queryTerm = exactAlias || expandedRaw || input;
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=br&q=${encodeURIComponent(`${queryTerm}, Brasil`)}`;
        const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal });
        const payload = (await response.json()) as Array<{
          lat: string;
          lon: string;
          class?: string;
          type?: string;
          addresstype?: string;
          address?: {
            road?: string;
            suburb?: string;
            city?: string;
            town?: string;
            village?: string;
            municipality?: string;
            county?: string;
            state?: string;
            postcode?: string;
            "ISO3166-2-lvl4"?: string;
          };
        }>;
        const rawItems = Array.isArray(payload) ? payload : [];
        const normalizedInput = normalizeForMatch(input);
        const inputTokens = tokens(input);
        const looksLikeCityQuery = !/\d/.test(input) && inputTokens.length > 0;
        const isAddressQuery = looksLikeAddressQuery(input);

        const cityFirst = rawItems.sort((a, b) => {
          const cityTypes = ["city", "town", "village", "municipality", "administrative"];
          const aCity = cityTypes.includes(a.type ?? "") ? 0 : 1;
          const bCity = cityTypes.includes(b.type ?? "") ? 0 : 1;
          return aCity - bCity;
        });

        const external = cityFirst.map((item, index): LocationSuggestion | null => {
          const road = item.address?.road ?? "";
          const suburb = item.address?.suburb ?? "";
          const city = item.address?.city ?? item.address?.town ?? item.address?.village ?? item.address?.municipality ?? item.address?.county ?? "";
          const state = item.address?.state ?? "";
          const stateIso = item.address?.["ISO3166-2-lvl4"] ?? "";
          const ufFromIso = stateIso.includes("-") ? stateIso.split("-")[1] : "";
          const uf = (ufFromIso || toUf(state)).toUpperCase();
          const postcode = item.address?.postcode ?? "";
          const isCityLike = ["city", "town", "village", "municipality", "administrative"].includes(item.type ?? "");
          const normalizedCity = normalizeForMatch(city);
          const anyField = normalizeForMatch([city, road, suburb, state, postcode].join(" "));
          const cityScore = matchTokenScore(normalizedCity, inputTokens);
          const overallScore = matchTokenScore(anyField, inputTokens);
          const fuzzy = Math.max(fuzzyScore(anyField, expanded), fuzzyScore(anyField, input));
          const cityTokenMatch = cityScore >= 0.4;
          const genericTokenMatch = overallScore >= 0.4 || fuzzy >= 0.4;

          if (aliasExpanded && fuzzyScore(anyField, aliasExpanded) < 0.4) {
            return null;
          }
          if (looksLikeCityQuery && !isAddressQuery && !isCityLike && !cityTokenMatch && !genericTokenMatch) {
            return null;
          }
          if (isAddressQuery && !genericTokenMatch) {
            return null;
          }

          const label = isCityLike || normalizedInput.length <= 4
            ? [city, uf].filter(Boolean).join(" - ")
            : [road, suburb, [city, uf].filter(Boolean).join(" - "), postcode].filter(Boolean).join(", ");

          return {
            id: `ext-${index}-${normalizeText(label || `${item.lat}-${item.lon}`)}`,
            label: label || [city, uf].filter(Boolean).join(" - ") || "Local",
            lat: Number(item.lat),
            lng: Number(item.lon),
            cep: normalizeCep(postcode)
          };
        }).filter((item): item is LocationSuggestion => item !== null);
        const merged = [cepSuggestionCandidate, ...known, typedSuggestion, ...external, ...local].filter(Boolean) as LocationSuggestion[];
        const dedup = new Map<string, LocationSuggestion>();
        for (const item of merged) {
          const key = normalizeText(item.label);
          if (!dedup.has(key)) dedup.set(key, item);
        }
        const rawInputUpper = input.replace(/\s+/g, "").toUpperCase();
        const ranked = Array.from(dedup.values()).sort((a, b) => {
          const aNorm = normalizeForMatch(a.label);
          const bNorm = normalizeForMatch(b.label);
          const aScore = matchTokenScore(aNorm, inputTokens);
          const bScore = matchTokenScore(bNorm, inputTokens);
          const aFuzzy = Math.max(fuzzyScore(a.label, input), fuzzyScore(a.label, expanded));
          const bFuzzy = Math.max(fuzzyScore(b.label, input), fuzzyScore(b.label, expanded));
          const aAcr = acronymOf(a.label);
          const bAcr = acronymOf(b.label);
          const aAcrHit = rawInputUpper.length >= 2 && aAcr.includes(rawInputUpper) ? 1 : 0;
          const bAcrHit = rawInputUpper.length >= 2 && bAcr.includes(rawInputUpper) ? 1 : 0;
          if (aAcrHit !== bAcrHit) return bAcrHit - aAcrHit;
          if (aFuzzy !== bFuzzy) return bFuzzy - aFuzzy;
          return bScore - aScore;
        });
        setSuggestions(
          ranked
            .filter((item) => Math.max(fuzzyScore(item.label, input), fuzzyScore(item.label, expanded)) >= 0.4)
            .slice(0, 8)
        );
      } catch {
        setSuggestions([...known, typedSuggestion, ...local]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [locationInput, localSuggestions]);
  const selectSuggestion = (item: LocationSuggestion) => {
    setLocationInput(item.label);
    setSelectedCep(normalizeCep(item.cep ?? ""));
    setUserPoint({ lat: item.lat, lng: item.lng });
    setShowSuggestions(false);
    setLocationStatus("Local selecionado. Lojas ordenadas por proximidade.");
  };

  const handleFindNearestStore = async () => {
    skipAutoScrollRef.current = true;
    const sanitizedCep = normalizeCep(selectedCep || locationInput);
    if (sanitizedCep.length === 8) {
      await applyCepLocation(sanitizedCep);
      return;
    }
    if (locationInput.trim().length >= 3) {
      await applyTextLocation(locationInput);
      return;
    }
    requestUserLocation();
  };

  useEffect(() => {
    requestUserLocation();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!suggestionsRef.current) return;
      if (!suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
  const selectedStoreIndex = useMemo(
    () => filteredStores.findIndex((store) => store.id === selectedStoreId),
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
    const selectedFromMap = filteredStores.find((store) => store.id === storeId) ?? null;
    if (selectedFromMap) {
      setStoreModal(selectedFromMap);
    }
  };

  const scrollStoreCardIntoView = (storeId: number) => {
    const card = storeCardRefs.current.get(storeId);
    if (!card) return;
    skipAutoScrollRef.current = true;
    card.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center"
    });
  };

  const selectStoreFromCarousel = (storeId: number) => {
    setSelectedStoreId(storeId);
    scrollStoreCardIntoView(storeId);
  };

  const stepStoreCarousel = (direction: "previous" | "next") => {
    if (!filteredStores.length) return;
    const currentIndex = selectedStoreIndex >= 0 ? selectedStoreIndex : 0;
    const nextIndex = direction === "next"
      ? Math.min(currentIndex + 1, filteredStores.length - 1)
      : Math.max(currentIndex - 1, 0);
    const nextStore = filteredStores[nextIndex];
    if (nextStore) selectStoreFromCarousel(nextStore.id);
  };

  const handleStoreListScroll = (event: UIEvent<HTMLDivElement>) => {
    const list = event.currentTarget;
    const firstCard = list.querySelector<HTMLElement>(".stores-directory-card");
    if (!firstCard) return;

    const gap = 10;
    const cardWidth = firstCard.offsetWidth + gap;
    if (cardWidth <= 0) return;

    const nextIndex = Math.max(0, Math.min(filteredStores.length - 1, Math.round(list.scrollLeft / cardWidth)));
    const nextStore = filteredStores[nextIndex];
    if (nextStore && nextStore.id !== selectedStoreId) {
      setSelectedStoreId(nextStore.id);
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
            <div className="stores-search-autocomplete" ref={suggestionsRef}>
              <label className="stores-search-input" htmlFor="stores-location">
                <MapPin size={19} />
                <input
                  id="stores-location"
                  type="text"
                  placeholder="Digite CEP, cidade, estado etc."
                  value={locationInput}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    const digits = normalizeCep(nextValue);
                    const useCepMask = digits.length >= 5 && /^[\d\s-]+$/.test(nextValue);
                    setLocationInput(useCepMask ? formatCep(digits) : nextValue);
                    setSelectedCep("");
                    setShowSuggestions(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleFindNearestStore();
                    }
                  }}
                />
              </label>

              {showSuggestions && (suggestions.length > 0 || isFetchingSuggestions) ? (
                <div className="stores-search-suggestions" role="listbox" aria-label="Sugestões de local">
                  {suggestions.map((item) => (
                    <button key={item.id} type="button" className="stores-search-suggestion" onClick={() => selectSuggestion(item)}>
                      <MapPin size={14} />
                      <span>{item.cep ? `${item.label.replace(item.cep, formatCep(item.cep))}` : item.label}</span>
                    </button>
                  ))}
                  {isFetchingSuggestions ? <p className="stores-search-loading">Buscando mais opções...</p> : null}
                </div>
              ) : null}
            </div>

            <button type="button" className="stores-filter-input" aria-label="Buscar loja mais próxima" onClick={() => void handleFindNearestStore()}>
              <Search size={17} />
              <span>Buscar</span>
            </button>
          </div>

          {locationStatus ? <p className="stores-location-status">{locationStatus}</p> : null}

          <div className="stores-directory-list" ref={storesListRef} onScroll={handleStoreListScroll}>
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
          {!loading && filteredStores.length > 1 ? (
            <div className="stores-mobile-carousel-controls" aria-label="Navegar pelas lojas">
              <button
                type="button"
                aria-label="Loja anterior"
                onClick={() => stepStoreCarousel("previous")}
                disabled={selectedStoreIndex <= 0}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="stores-mobile-carousel-dots">
                {filteredStores.map((store, index) => (
                  <button
                    key={store.id}
                    type="button"
                    className={index === selectedStoreIndex ? "is-active" : ""}
                    aria-label={`Ir para loja ${index + 1}`}
                    aria-current={index === selectedStoreIndex ? "true" : undefined}
                    onClick={() => selectStoreFromCarousel(store.id)}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Próxima loja"
                onClick={() => stepStoreCarousel("next")}
                disabled={selectedStoreIndex === filteredStores.length - 1}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : null}
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




