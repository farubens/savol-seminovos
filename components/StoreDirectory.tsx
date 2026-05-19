"use client";

import { MapPin, Navigation, PhoneCall } from "lucide-react";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";

export function StoreDirectory() {
  const { stores, loading } = useHomeSessionData();

  return (
    <section className="container stores-page">
      <header className="stores-page-head">
        <h1>Nossas lojas</h1>
        <p>{loading ? "Carregando unidades..." : `${stores.length} unidade(s) disponível(is)`}</p>
      </header>

      <div className="stores-page-grid">
        {!loading &&
          stores.map((store) => (
            <article key={store.id} className="stores-page-card">
              <p className="stores-page-brand">{store.brand}</p>
              <h3>{store.name}</h3>
              <p className="stores-page-address">
                <MapPin size={16} /> {store.address}
              </p>
              <p className="stores-page-phone">
                <PhoneCall size={16} /> {store.phone}
              </p>
              <div className="stores-page-actions">
                <a href={store.storeUrl} target="_blank" rel="noopener noreferrer">
                  Ver loja
                </a>
                <a href={store.mapUrl} target="_blank" rel="noopener noreferrer">
                  <Navigation size={14} /> Como chegar
                </a>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
