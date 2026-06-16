"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import type { ApiStore } from "@/types/home";

const WHATSAPP_PHONE = "551144351000";
const WHATSAPP_TEXT = "Olá! Quero atendimento da Savol.";
const AUTO_OPEN_STORAGE_KEY = "savol-whatsapp-chat-opened";

type ChatStep = "intro" | "name" | "email" | "phone" | "store" | "done";

type ChatForm = {
  name: string;
  email: string;
  phone: string;
};

function normalizePhone(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return WHATSAPP_PHONE;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function cleanDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function formatPhoneInput(value: string): string {
  const digits = cleanDigits(value, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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
  const [step, setStep] = useState<ChatStep>("intro");
  const [chatForm, setChatForm] = useState<ChatForm>({ name: "", email: "", phone: "" });
  const [currentValue, setCurrentValue] = useState("");
  const [fieldError, setFieldError] = useState("");
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
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(AUTO_OPEN_STORAGE_KEY) === "true") return;

    const timerId = window.setTimeout(() => {
      window.sessionStorage.setItem(AUTO_OPEN_STORAGE_KEY, "true");
      setIsOpen(true);
    }, 7000);

    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  useEffect(() => {
    setCurrentValue("");
    setFieldError("");
  }, [step]);

  useEffect(() => {
    if (selectedStoreId || sortedStores.length === 0) return;
    setSelectedStoreId(String(sortedStores[0].id));
  }, [selectedStoreId, sortedStores]);

  const selectedStore = sortedStores.find((store) => String(store.id) === selectedStoreId);
  const canSubmitTextStep = step === "intro" || step === "name" || step === "email" || step === "phone";

  const openChat = () => {
    setIsOpen((current) => !current);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(AUTO_OPEN_STORAGE_KEY, "true");
    }
  };

  const submitCurrentStep = () => {
    const value = currentValue.trim();

    if (step === "intro") {
      setStep("name");
      return;
    }

    if (step === "name") {
      if (!value) {
        setFieldError("Digite seu nome para continuar.");
        return;
      }
      setChatForm((current) => ({ ...current, name: value }));
      setStep("email");
      return;
    }

    if (step === "email") {
      if (!/^\S+@\S+\.\S+$/.test(value)) {
        setFieldError("Digite um e-mail válido.");
        return;
      }
      setChatForm((current) => ({ ...current, email: value }));
      setStep("phone");
      return;
    }

    if (step === "phone") {
      const phoneDigits = cleanDigits(value, 11);
      if (phoneDigits.length < 10) {
        setFieldError("Digite um telefone válido.");
        return;
      }
      setChatForm((current) => ({ ...current, phone: formatPhoneInput(value) }));
      setStep("store");
    }
  };

  const handleInputChange = (value: string) => {
    setFieldError("");
    setCurrentValue(step === "phone" ? formatPhoneInput(value) : value);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitCurrentStep();
  };

  const startWhatsApp = () => {
    const phone = selectedStore?.phone ?? WHATSAPP_PHONE;
    const unitText = selectedStore ? formatStoreName(selectedStore.name) : "Atendimento Savol";
    const pageText = isVehicleDetail ? `\nPágina: ${window.location.href}` : "";
    const message = [
      "Olá! Vim pelo chat do site e quero atendimento.",
      `Nome: ${chatForm.name}`,
      `E-mail: ${chatForm.email}`,
      `Telefone: ${chatForm.phone}`,
      `Unidade de atendimento: ${unitText}${pageText}`
    ].join("\n");

    window.open(createWhatsAppHref(phone, message), "_blank", "noopener,noreferrer");
    setStep("done");
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="floating-whatsapp-btn"
        aria-label="Abrir chat de atendimento pelo WhatsApp"
        onClick={openChat}
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
            <Image src="/images/whatsapp_icon.png" alt="" width={26} height={26} className="whatsapp-chat-head-icon" />
            <div>
              <h2 id="whatsapp-store-title">Atendimento Savol</h2>
              <p>Online agora</p>
            </div>
          </header>

          <div className="whatsapp-chat-body">
            <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent">Olá, como posso te ajudar hoje?</p>

            {step !== "intro" ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--user">Quero atendimento</p> : null}
            {step === "name" ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent">Claro. Primeiro, qual é o seu nome?</p> : null}
            {chatForm.name ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--user">{chatForm.name}</p> : null}
            {step !== "intro" && step !== "name" ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent">Perfeito. Qual é o seu e-mail?</p> : null}
            {chatForm.email ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--user">{chatForm.email}</p> : null}
            {step === "phone" || step === "store" || step === "done" ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent">Agora me informe seu telefone.</p> : null}
            {chatForm.phone ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--user">{chatForm.phone}</p> : null}
            {step === "store" ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent">Por último, escolha a unidade de atendimento.</p> : null}
          </div>

          <div className="whatsapp-store-form whatsapp-chat-controls">
            {loading ? <p className="whatsapp-store-loading">Carregando lojas...</p> : null}

            {canSubmitTextStep ? (
              <div className="whatsapp-chat-input-row">
                {step === "intro" ? (
                  <button type="button" className="whatsapp-start-btn" onClick={submitCurrentStep}>
                    Começar atendimento
                  </button>
                ) : (
                  <>
                    <input
                      type={step === "email" ? "email" : "text"}
                      inputMode={step === "phone" ? "numeric" : "text"}
                      placeholder={step === "name" ? "Digite seu nome" : step === "email" ? "Digite seu e-mail" : "Digite seu telefone"}
                      value={currentValue}
                      onChange={(event) => handleInputChange(event.target.value)}
                      onKeyDown={handleInputKeyDown}
                    />
                    <button type="button" className="whatsapp-chat-send" aria-label="Enviar resposta" onClick={submitCurrentStep}>
                      <Send size={17} />
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {step === "store" ? (
              <>
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

                <button type="button" className="whatsapp-start-btn" onClick={startWhatsApp}>
                  Ir para o WhatsApp
                </button>
              </>
            ) : null}

            {fieldError ? <p className="whatsapp-chat-error">{fieldError}</p> : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
