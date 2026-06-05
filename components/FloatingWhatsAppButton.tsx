"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ApiStore } from "@/types/home";

const WHATSAPP_PHONE = "551144351000";
const WHATSAPP_TEXT = "Olá! Quero atendimento da Savol.";
const WHATSAPP_SUBJECTS = ["Seminovos", "Compra por atacado", "Vender seu carro"];

function normalizePhone(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return WHATSAPP_PHONE;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function createWhatsAppHref(phone: string, message = WHATSAPP_TEXT): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

function isVehicleDetailPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length === 2 && parts[0] === "veiculos";
}

function formatStoreName(value: string): string {
  return value.replace(/^Unidade Savol\s*/i, "Savol ").trim();
}

export function FloatingWhatsAppButton() {
  const pathname = usePathname();
  const isVehicleDetail = isVehicleDetailPath(pathname);
  const [isOpen, setIsOpen] = useState(false);
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(WHATSAPP_SUBJECTS[0]);
  const hasLoadedStoresRef = useRef(false);

  const sortedStores = useMemo(
    () => [...stores].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [stores]
  );

  useEffect(() => {
    if (!isOpen || hasLoadedStoresRef.current) return;

    const controller = new AbortController();
    hasLoadedStoresRef.current = true;
    setLoading(true);
    fetch("/api/lojas?per_page=60", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload: { items?: ApiStore[] } | ApiStore[]) => {
        const items = Array.isArray(payload) ? payload : payload.items;
        setStores(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        setStores([]);
        hasLoadedStoresRef.current = false;
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  useEffect(() => {
    if (selectedStoreId || sortedStores.length === 0) return;
    setSelectedStoreId(String(sortedStores[0].id));
  }, [selectedStoreId, sortedStores]);

  const selectedStore = sortedStores.find((store) => String(store.id) === selectedStoreId);

  const startWhatsApp = () => {
    const phone = selectedStore?.phone ?? WHATSAPP_PHONE;
    const unitText = selectedStore ? ` da ${selectedStore.name}` : "";
    const message = `Olá! Quero atendimento${unitText}. Assunto: ${selectedSubject}.`;
    window.open(createWhatsAppHref(phone, message), "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  if (isVehicleDetail) {
    return (
      <a
        href={createWhatsAppHref(WHATSAPP_PHONE)}
        className="floating-whatsapp-btn"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Atendimento pelo WhatsApp"
      >
        <Image src="/images/whatsapp_icon.png" alt="" width={28} height={28} className="floating-whatsapp-icon" />
        <span>WhatsApp</span>
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className="floating-whatsapp-btn"
        aria-label="Escolher loja para atendimento pelo WhatsApp"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Image src="/images/whatsapp_icon.png" alt="" width={28} height={28} className="floating-whatsapp-icon" />
        <span>WhatsApp</span>
      </button>

      {isOpen ? (
        <section className="whatsapp-store-modal" aria-modal="false" role="dialog" aria-labelledby="whatsapp-store-title">
          <button type="button" className="whatsapp-store-modal-close" aria-label="Fechar" onClick={() => setIsOpen(false)}>
            <X size={16} />
          </button>

          <header className="whatsapp-store-modal-head">
            <h2 id="whatsapp-store-title">Unidade de atendimento</h2>
          </header>

          <div className="whatsapp-store-form">
            {loading ? <p className="whatsapp-store-loading">Carregando lojas...</p> : null}

            <label className="whatsapp-store-field">
              <span className="sr-only">Unidade de atendimento</span>
              <select value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)} disabled={loading || sortedStores.length === 0}>
                {sortedStores.length === 0 ? <option value="">Atendimento Savol</option> : null}
                {sortedStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {formatStoreName(store.name)}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="whatsapp-subjects">
              <legend>Assunto</legend>
              {WHATSAPP_SUBJECTS.map((subject) => (
                <label key={subject}>
                  <input
                    type="radio"
                    name="floating-whatsapp-subject"
                    value={subject}
                    checked={selectedSubject === subject}
                    onChange={(event) => setSelectedSubject(event.target.value)}
                  />
                  <span>{subject}</span>
                </label>
              ))}
            </fieldset>

            <button type="button" className="whatsapp-start-btn" onClick={startWhatsApp}>
              Iniciar
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
