"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { logLeadmobResponse, logLeadPayload } from "@/lib/leadDebug";
import { getLeadTrackingPayload } from "@/lib/leadTracking";
import { resolveSavolWhatsAppPhoneFromParts } from "@/lib/savolWhatsApp";
import type { LeadmobVehicle } from "@/lib/leadmob";

const WHATSAPP_PHONE = "551149796000";
const TOYOTA_STORE_NAME = "Savol Toyota";
const WHATSAPP_TEXT = "Olá! Quero atendimento da Savol.";
const AUTO_OPEN_STORAGE_KEY = "savol-whatsapp-chat-opened";
const TYPING_DELAY_MS = 800;

type ChatStep = "intro" | "name" | "email" | "phone" | "message" | "done";
const CHAT_STEP_ORDER: ChatStep[] = ["intro", "name", "email", "phone", "message", "done"];

type ChatForm = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

type VehicleLeadContext = {
  unitName?: string;
  phone?: string;
  vehicleName?: string;
  pageUrl?: string;
  vehicle?: LeadmobVehicle;
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

function isAgentStepVisible(current: ChatStep | null, target: ChatStep): boolean {
  if (!current) return false;
  return CHAT_STEP_ORDER.indexOf(current) >= CHAT_STEP_ORDER.indexOf(target);
}

export function FloatingWhatsAppButton() {
  const pathname = usePathname();
  const isVehicleDetail = isVehicleDetailPath(pathname);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ChatStep>("intro");
  const [visibleAgentStep, setVisibleAgentStep] = useState<ChatStep | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isSendingLead, setIsSendingLead] = useState(false);
  const [chatForm, setChatForm] = useState<ChatForm>({ name: "", email: "", phone: "", message: "" });
  const [currentValue, setCurrentValue] = useState("");
  const [fieldError, setFieldError] = useState("");
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isVehicleDetail) return;
    if (window.sessionStorage.getItem(AUTO_OPEN_STORAGE_KEY) === "true") return;

    const timerId = window.setTimeout(() => {
      window.sessionStorage.setItem(AUTO_OPEN_STORAGE_KEY, "true");
      setIsOpen(true);
    }, 7000);

    return () => window.clearTimeout(timerId);
  }, [isVehicleDetail]);

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
    if (!isOpen || step === "done" || visibleAgentStep === step) return;

    setIsTyping(true);
    const timerId = window.setTimeout(() => {
      setVisibleAgentStep(step);
      setIsTyping(false);
    }, TYPING_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [isOpen, step, visibleAgentStep]);

  useEffect(() => {
    if (!isOpen) return;
    const chatBody = chatBodyRef.current;
    if (!chatBody) return;
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }, [chatForm.email, chatForm.message, chatForm.name, chatForm.phone, isOpen, isTyping, visibleAgentStep]);

  const canSubmitTextStep = step === "intro" || step === "name" || step === "email" || step === "phone" || step === "message";
  const isCurrentStepReady = visibleAgentStep === step && !isTyping;

  const resetChat = () => {
    setStep("intro");
    setVisibleAgentStep(null);
    setIsTyping(false);
    setIsSendingLead(false);
    setChatForm({ name: "", email: "", phone: "", message: "" });
    setCurrentValue("");
    setFieldError("");
  };

  const openChat = () => {
    if (!isOpen && step === "done") {
      resetChat();
    }
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
      setStep("message");
      return;
    }

    if (step === "message") {
      if (!value) {
        setFieldError("Escreva uma mensagem para nossa equipe.");
        return;
      }
      setChatForm((current) => ({ ...current, message: value }));
      void startWhatsApp(value);
    }
  };

  const handleInputChange = (value: string) => {
    setFieldError("");
    setCurrentValue(step === "phone" ? formatPhoneInput(value) : value);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    if (event.currentTarget.tagName === "TEXTAREA" && !event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    submitCurrentStep();
  };

  const getVehicleLeadContext = (): VehicleLeadContext | null => {
    if (!isVehicleDetail || typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem("savol-current-vehicle-lead-context");
      return raw ? (JSON.parse(raw) as VehicleLeadContext) : null;
    } catch {
      return null;
    }
  };

  async function startWhatsApp(messageOverride?: string) {
    if (isSendingLead) return;

    const vehicleContext = getVehicleLeadContext();
    const phone = isVehicleDetail && vehicleContext
      ? resolveSavolWhatsAppPhoneFromParts([
          vehicleContext.unitName,
          vehicleContext.vehicle?.store,
          vehicleContext.vehicle?.brand,
          vehicleContext.vehicle?.model,
          vehicleContext.phone
        ])
      : WHATSAPP_PHONE;
    const unitText = vehicleContext?.unitName ?? TOYOTA_STORE_NAME;
    const customerUnitText = vehicleContext?.unitName ?? "Atendimento Savol";
    const customerMessage = (messageOverride ?? chatForm.message).trim();
    const pageText = isVehicleDetail ? `\nPágina: ${vehicleContext?.pageUrl || window.location.href}` : "";
    const vehicleText = vehicleContext?.vehicleName ? `\nVeículo: ${vehicleContext.vehicleName}` : "";
    const message = [
      "Olá! Vim pelo chat do site e quero atendimento.",
      `Nome: ${chatForm.name}`,
      `E-mail: ${chatForm.email}`,
      `Telefone: ${chatForm.phone}`,
      `Mensagem: ${customerMessage}`,
      `Atendimento: ${customerUnitText}${vehicleText}${pageText}`
    ].join("\n");

    setIsSendingLead(true);

    try {
      const formName = isVehicleDetail ? "whatsapp-veiculo" : "whatsapp-site";
      const tracking = getLeadTrackingPayload({
        form: formName,
        unitName: unitText,
        vehicle: vehicleContext?.vehicleName || ""
      });
      const leadPayload = {
        form: formName,
        subject: "WhatsApp",
        name: chatForm.name,
        email: chatForm.email,
        phone: chatForm.phone,
        unitName: unitText,
        vehicle: vehicleContext?.vehicle,
        customerMessage,
        message,
        utm: tracking.utm,
        meta: {
          ...tracking.meta,
          page_url: vehicleContext?.pageUrl || tracking.meta.page_url
        }
      };
      logLeadPayload(formName, leadPayload);
      const response = await fetch("/api/leadmob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadPayload)
      });
      await logLeadmobResponse(formName, response);
    } catch {
      // O WhatsApp deve continuar abrindo mesmo se o CRM estiver temporariamente indisponível.
    } finally {
      setIsSendingLead(false);
    }

    window.open(createWhatsAppHref(phone, message), "_blank", "noopener,noreferrer");
    setStep("done");
  }

  if (isVehicleDetail) {
    return null;
  }

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

          <div className="whatsapp-chat-body" ref={chatBodyRef}>
            {isAgentStepVisible(visibleAgentStep, "intro") ? (
              <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent">Olá, como posso te ajudar hoje?</p>
            ) : null}

            {step !== "intro" ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--user">Quero atendimento</p> : null}
            {isAgentStepVisible(visibleAgentStep, "name") ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent">Claro. Primeiro, qual é o seu nome?</p> : null}
            {chatForm.name ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--user">{chatForm.name}</p> : null}
            {isAgentStepVisible(visibleAgentStep, "email") ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent">Perfeito. Qual é o seu e-mail?</p> : null}
            {chatForm.email ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--user">{chatForm.email}</p> : null}
            {isAgentStepVisible(visibleAgentStep, "phone") ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent">Agora me informe seu telefone.</p> : null}
            {chatForm.phone ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--user">{chatForm.phone}</p> : null}
            {isAgentStepVisible(visibleAgentStep, "message") ? (
              <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent">
                Para finalizar, escreva sua mensagem. Pode contar rapidinho como podemos ajudar.
              </p>
            ) : null}
            {chatForm.message ? <p className="whatsapp-chat-bubble whatsapp-chat-bubble--user">{chatForm.message}</p> : null}
            {step === "done" ? (
              <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent">
                Sua mensagem foi enviada com sucesso. Nosso horario de atendimento e de segunda a sexta, das 8h as 18h. Retornaremos assim que possivel.
              </p>
            ) : null}
            {isTyping ? (
              <p className="whatsapp-chat-bubble whatsapp-chat-bubble--agent whatsapp-chat-typing" aria-label="Atendente digitando">
                <span />
                <span />
                <span />
              </p>
            ) : null}
          </div>

          <div className="whatsapp-store-form whatsapp-chat-controls">
            {canSubmitTextStep && isCurrentStepReady ? (
              <div className="whatsapp-chat-input-row">
                {step === "intro" ? (
                  <button type="button" className="whatsapp-start-btn" onClick={submitCurrentStep}>
                    Começar atendimento
                  </button>
                ) : (
                  <>
                    {step === "message" ? (
                      <textarea
                        rows={3}
                        placeholder="Escreva aqui sua mensagem..."
                        value={currentValue}
                        onChange={(event) => handleInputChange(event.target.value)}
                        onKeyDown={handleInputKeyDown}
                      />
                    ) : (
                      <input
                        type={step === "email" ? "email" : "text"}
                        inputMode={step === "phone" ? "numeric" : "text"}
                        placeholder={step === "name" ? "Digite seu nome" : step === "email" ? "Digite seu e-mail" : "Digite seu telefone"}
                        value={currentValue}
                        onChange={(event) => handleInputChange(event.target.value)}
                        onKeyDown={handleInputKeyDown}
                      />
                    )}
                    <button type="button" className="whatsapp-chat-send" aria-label="Enviar resposta" onClick={submitCurrentStep} disabled={isSendingLead}>
                      <Send size={17} />
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {fieldError ? <p className="whatsapp-chat-error">{fieldError}</p> : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
