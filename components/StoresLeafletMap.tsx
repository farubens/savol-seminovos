"use client";

import { useEffect, useMemo } from "react";
import L, { type LatLngBoundsExpression, type LatLngExpression } from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";

export type StoreMapPoint = {
  id: number;
  name: string;
  brand: string;
  lat: number;
  lng: number;
};

type StoresLeafletMapProps = {
  stores: StoreMapPoint[];
  selectedStoreId: number | null;
  focusStoreId: number | null;
  layoutSignal: string;
  onSelectStore: (storeId: number) => void;
};

const DEFAULT_CENTER: LatLngExpression = [-23.66, -46.55];
const DEFAULT_ZOOM = 12;
const FOCUSED_ZOOM = 15;

function buildMarkerIcon(index: number, isActive: boolean): L.DivIcon {
  const markerClass = isActive ? "stores-map-pin is-active" : "stores-map-pin";
  return L.divIcon({
    className: "stores-map-pin-host",
    html: `<span class="${markerClass}">${index + 1}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function FocusController({ stores, focusStoreId }: { stores: StoreMapPoint[]; focusStoreId: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (!stores.length) return;

    if (focusStoreId != null) {
      const selected = stores.find((store) => store.id === focusStoreId);
      if (selected) {
        map.flyTo([selected.lat, selected.lng], FOCUSED_ZOOM, {
          animate: true,
          duration: 0.7
        });
      }
      return;
    }

    const bounds = L.latLngBounds(stores.map((store) => [store.lat, store.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.08), {
      animate: true,
      duration: 0.7
    });
  }, [focusStoreId, map, stores]);

  return null;
}

function ResizeController({ layoutSignal }: { layoutSignal: string }) {
  const map = useMap();

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      map.invalidateSize();
    }, 240);
    return () => window.clearTimeout(timerId);
  }, [layoutSignal, map]);

  return null;
}

export function StoresLeafletMap({ stores, selectedStoreId, focusStoreId, layoutSignal, onSelectStore }: StoresLeafletMapProps) {
  const bounds = useMemo<LatLngBoundsExpression | undefined>(() => {
    if (!stores.length) return undefined;
    return stores.map((store) => [store.lat, store.lng] as [number, number]);
  }, [stores]);

  return (
    <MapContainer
      className="stores-map-canvas"
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      bounds={bounds}
      boundsOptions={{ padding: [20, 20], maxZoom: 14 }}
      zoomControl={false}
      scrollWheelZoom
    >
      <ZoomControl position="topright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {stores.map((store, index) => {
        const isActive = store.id === selectedStoreId;
        return (
          <Marker
            key={store.id}
            position={[store.lat, store.lng]}
            icon={buildMarkerIcon(index, isActive)}
            eventHandlers={{ click: () => onSelectStore(store.id) }}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -18]}
              className={`stores-map-tooltip ${isActive ? "is-active" : ""}`}
              opacity={1}
            >
              {store.brand}
            </Tooltip>
          </Marker>
        );
      })}

      <FocusController stores={stores} focusStoreId={focusStoreId} />
      <ResizeController layoutSignal={layoutSignal} />
    </MapContainer>
  );
}
