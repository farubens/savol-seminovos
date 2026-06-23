"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import { CheckCircle2, Send, X } from "lucide-react";
import { logLeadmobResponse, logLeadPayload } from "@/lib/leadDebug";
import { getLeadTrackingPayload } from "@/lib/leadTracking";
import type { LeadmobVehicle } from "@/lib/leadmob";

type FinanceFollowUpModalProps = {
  open: boolean;
  onClose: () => void;
  context?: {
    form?: string;
    subject?: string;
    unitName?: string;
    message?: string;
    vehicle?: LeadmobVehicle;
  };
};

type FollowUpForm = {
  name: string;
  phone: string;
  email: string;
  cpf: string;
};

const initialForm: FollowUpForm = {
  name: "",
  phone: "",
  email: "",
  cpf: ""
};

function cleanDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function formatPhone(value: string): string {
  const digits = cleanDigits(value, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCpf(value: string): string {
  const digits = cleanDigits(value, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function FinanceFollowUpModal({ open, onClose, context }: FinanceFollowUpModalProps) {
  const modalId = useId();
  const [form, setForm] = useState<FollowUpForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FollowUpForm, string>>>({});
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setSent(false);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const updateField = (field: keyof FollowUpForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSent(false);
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FollowUpForm, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Informe seu nome";
    if (cleanDigits(form.phone, 11).length < 10) nextErrors.phone = "Informe um telefone válido";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Informe um e-mail válido";
    if (cleanDigits(form.cpf, 11).length !== 11) nextErrors.cpf = "Informe um CPF válido";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const formName = context?.form || "financiamento-follow-up";
      const subject = context?.subject || "Financiamento";
      const tracking = getLeadTrackingPayload({
        form: formName,
        subject,
        unitName: context?.unitName,
        vehicle: context?.vehicle?.model || context?.vehicle?.subtitle || ""
      });
      const leadPayload = {
        form: formName,
        subject,
        name: form.name,
        phone: form.phone,
        email: form.email,
        cpf: cleanDigits(form.cpf, 11),
        unitName: context?.unitName,
        vehicle: context?.vehicle,
        message: [context?.message, `CPF: ${cleanDigits(form.cpf, 11)}`].filter(Boolean).join("\n"),
        utm: tracking.utm,
        meta: tracking.meta
      };
      logLeadPayload(formName, leadPayload);
      const response = await fetch("/api/financiamento-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadPayload)
      });
      await logLeadmobResponse(formName, response);

      if (!response.ok) throw new Error("leadmob");
      setSent(true);
    } catch {
      setErrors((current) => ({ ...current, email: "Não foi possível enviar agora. Tente novamente." }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="finance-followup-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="finance-followup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="finance-followup-close" aria-label="Fechar" onClick={onClose}>
          <X size={20} />
        </button>

        <header className="finance-followup-head">
          <h2 id={`${modalId}-title`}>Temos mais opções de financiamento.</h2>
          <p>Preencha o formulário a seguir para conhecer as condições.</p>
        </header>

        <form className="finance-followup-form" onSubmit={handleSubmit}>
          <label htmlFor={`${modalId}-name`}>
            <span>Nome</span>
            <input id={`${modalId}-name`} type="text" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
            {errors.name ? <small>{errors.name}</small> : null}
          </label>

          <label htmlFor={`${modalId}-phone`}>
            <span>Telefone</span>
            <input
              id={`${modalId}-phone`}
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(event) => updateField("phone", formatPhone(event.target.value))}
            />
            {errors.phone ? <small>{errors.phone}</small> : null}
          </label>

          <label htmlFor={`${modalId}-email`}>
            <span>E-mail</span>
            <input id={`${modalId}-email`} type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
            {errors.email ? <small>{errors.email}</small> : null}
          </label>

          <label htmlFor={`${modalId}-cpf`}>
            <span>CPF</span>
            <input
              id={`${modalId}-cpf`}
              type="text"
              inputMode="numeric"
              value={form.cpf}
              onChange={(event) => updateField("cpf", formatCpf(event.target.value))}
            />
            {errors.cpf ? <small>{errors.cpf}</small> : null}
          </label>

          <button type="submit" className="finance-followup-submit" disabled={isSubmitting}>
            <Send size={18} /> {isSubmitting ? "Enviando..." : "Enviar"}
          </button>

          {sent ? (
            <p className="finance-followup-success">
              <CheckCircle2 size={17} /> Dados recebidos. Nossa equipe entrará em contato.
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
