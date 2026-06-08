"use client";

import Image from "next/image";
import {
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Fuel,
  Gauge,
  Mail,
  MapPin,
  Palette,
  Phone,
  Settings2,
  ShieldCheck,
  Store,
  Upload,
  UserRound,
  X
} from "lucide-react";
import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useHomeSessionData } from "@/components/HomeSessionDataProvider";

type Step = 1 | 2 | 3 | 4 | 5;

type UploadedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type PhotoSlotId =
  | "front"
  | "leftSide"
  | "rightSide"
  | "rear"
  | "dashboard"
  | "odometer"
  | "spare"
  | "trunk"
  | "roof"
  | "tire"
  | "engine"
  | "chassis";

type SellFormData = {
  brand: string;
  model: string;
  version: string;
  year: string;
  fuel: string;
  transmission: string;
  km: string;
  color: string;
  plateEnding: string;
  bodyType: string;
  ownerCount: string;
  hasManual: string;
  hasSpareKey: string;
  desiredPrice: string;
  notes: string;
  photos: Partial<Record<PhotoSlotId, UploadedPhoto>>;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  state: string;
  contactPeriod: string;
  contactChannel: string;
  acceptedTerms: boolean;
  acceptedLgpd: boolean;
};

type SellYourCarSubmitResponse = {
  ok?: boolean;
  protocol?: string;
  error?: string;
};

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 1, label: "Dados do veículo" },
  { id: 2, label: "Detalhes adicionais" },
  { id: 3, label: "Fotos do veículo" },
  { id: 4, label: "Seus dados" },
  { id: 5, label: "Confirmação" }
];

const FUEL_OPTIONS = ["Flex", "Gasolina", "Etanol", "Diesel", "Híbrido", "Elétrico"];
const TRANSMISSION_OPTIONS = ["Manual", "Automática", "CVT", "Automatizada"];
const COLOR_OPTIONS = ["Branco", "Prata", "Preto", "Cinza", "Azul", "Vermelho", "Verde", "Marrom"];
const BODY_OPTIONS = ["Hatch", "Sedan", "SUV", "Picape", "Crossover", "Van", "Utilitário"];
const OWNER_OPTIONS = ["Único dono", "2 donos", "3 donos", "4 ou mais"];
const YES_NO_OPTIONS = ["Sim", "Não"];
const CONTACT_PERIOD_OPTIONS = ["Manhã", "Tarde", "Noite", "Qualquer horário"];
const CONTACT_CHANNEL_OPTIONS = ["WhatsApp", "Ligação", "Email"];
const DEFAULT_BRANDS = ["Chevrolet", "Fiat", "Ford", "Honda", "Hyundai", "Jeep", "Kia", "Nissan", "Peugeot", "Toyota", "Volkswagen"];
const DEFAULT_MODELS = ["Onix", "Toro", "HB20", "Corolla", "Compass", "Kicks"];
const DEFAULT_VERSIONS = ["1.0", "1.3 Turbo", "2.0", "EX", "Limited"];
const DEFAULT_YEARS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010"];
const PHOTO_SLOTS: Array<{ id: PhotoSlotId; label: string }> = [
  { id: "front", label: "Frente" },
  { id: "leftSide", label: "Lateral esquerda" },
  { id: "rightSide", label: "Lateral direita" },
  { id: "rear", label: "Traseira" },
  { id: "dashboard", label: "Painel" },
  { id: "odometer", label: "Odômetro" },
  { id: "spare", label: "Estepe" },
  { id: "trunk", label: "Porta malas" },
  { id: "roof", label: "Teto" },
  { id: "tire", label: "Pneu" },
  { id: "engine", label: "Motor" },
  { id: "chassis", label: "Chassi" }
];

function createInitialFormState(): SellFormData {
  return {
    brand: "",
    model: "",
    version: "",
    year: "",
    fuel: "",
    transmission: "",
    km: "",
    color: "",
    plateEnding: "",
    bodyType: "",
    ownerCount: "",
    hasManual: "",
    hasSpareKey: "",
    desiredPrice: "",
    notes: "",
    photos: {},
    fullName: "",
    email: "",
    phone: "",
    whatsapp: "",
    city: "",
    state: "",
    contactPeriod: "",
    contactChannel: "",
    acceptedTerms: false,
    acceptedLgpd: false
  };
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

function cleanDigits(value: string, max: number): string {
  return value.replace(/[^\d]/g, "").slice(0, max);
}

function cleanPlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <small className="sell-field-help">{error}</small>;
}

function getPhotosList(photos: SellFormData["photos"]): UploadedPhoto[] {
  return PHOTO_SLOTS.map((slot) => photos[slot.id]).filter((photo): photo is UploadedPhoto => Boolean(photo));
}

function toNumberValue(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSellYourCarPayload(form: SellFormData) {
  const submittedAt = new Date().toISOString();

  return {
    schemaVersion: "1.0",
    source: {
      form: "venda-seu-carro",
      channel: "site",
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      submittedAt
    },
    vehicle: {
      brand: form.brand,
      model: form.model,
      version: form.version,
      year: form.year,
      fuel: form.fuel,
      transmission: form.transmission,
      km: toNumberValue(form.km),
      color: form.color,
      plateEnding: form.plateEnding,
      bodyType: form.bodyType,
      ownerCount: form.ownerCount,
      hasManual: form.hasManual,
      hasSpareKey: form.hasSpareKey,
      desiredPrice: toNumberValue(form.desiredPrice),
      notes: form.notes.trim()
    },
    seller: {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone,
      whatsapp: form.whatsapp,
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      contactPeriod: form.contactPeriod,
      contactChannel: form.contactChannel
    },
    consents: {
      acceptedTerms: form.acceptedTerms,
      acceptedLgpd: form.acceptedLgpd,
      acceptedAt: submittedAt
    },
    photos: PHOTO_SLOTS.map((slot) => {
      const photo = form.photos[slot.id];
      return {
        slotId: slot.id,
        label: slot.label,
        required: true,
        fieldName: `photo_${slot.id}`,
        fileName: photo?.file.name ?? "",
        mimeType: photo?.file.type ?? "",
        sizeBytes: photo?.file.size ?? 0,
        lastModified: photo?.file.lastModified ? new Date(photo.file.lastModified).toISOString() : ""
      };
    })
  };
}

export function SellYourCarWizard() {
  const { vehicles } = useHomeSessionData();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<SellFormData>(createInitialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);
  const photosRef = useRef<SellFormData["photos"]>({});

  useEffect(() => {
    photosRef.current = form.photos;
  }, [form.photos]);

  useEffect(() => () => {
    getPhotosList(photosRef.current).forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
  }, []);

  const brands = useMemo(() => {
    const fromApi = uniqueSorted(vehicles.map((vehicle) => vehicle.brand));
    return fromApi.length ? fromApi : DEFAULT_BRANDS;
  }, [vehicles]);

  const models = useMemo(() => {
    const fromApi = uniqueSorted(vehicles.filter((vehicle) => (form.brand ? vehicle.brand === form.brand : true)).map((vehicle) => vehicle.model));
    return fromApi.length ? fromApi : DEFAULT_MODELS;
  }, [vehicles, form.brand]);

  const versions = useMemo(() => {
    const fromApi = uniqueSorted(
      vehicles
        .filter((vehicle) => (form.brand ? vehicle.brand === form.brand : true))
        .filter((vehicle) => (form.model ? vehicle.model === form.model : true))
        .map((vehicle) => vehicle.version || vehicle.subtitle)
    );
    return fromApi.length ? fromApi : DEFAULT_VERSIONS;
  }, [vehicles, form.brand, form.model]);

  const years = useMemo(() => {
    const fromApi = uniqueSorted(vehicles.map((vehicle) => vehicle.year));
    return fromApi.length ? fromApi : DEFAULT_YEARS;
  }, [vehicles]);

  const isStepDone = (checkStep: Step): boolean => {
    if (checkStep === 1) return Boolean(form.brand && form.model && form.year && form.fuel && form.transmission && form.km && form.color && form.plateEnding);
    if (checkStep === 2) return Boolean(form.bodyType && form.ownerCount && form.hasManual && form.hasSpareKey && form.desiredPrice);
    if (checkStep === 3) return PHOTO_SLOTS.every((slot) => Boolean(form.photos[slot.id]));
    if (checkStep === 4) return Boolean(form.fullName && form.email && form.phone && form.city && form.state && form.contactPeriod && form.contactChannel);
    return Boolean(form.acceptedTerms && form.acceptedLgpd);
  };

  const clearError = (field: string) => setErrors((prev) => {
    if (!prev[field]) return prev;
    const { [field]: _removed, ...rest } = prev;
    return rest;
  });

  const handleChange = <K extends keyof SellFormData>(field: K, value: SellFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const validateStep = (targetStep: Step): boolean => {
    const nextErrors: Record<string, string> = {};
    if (targetStep === 1) {
      if (!form.brand) nextErrors.brand = "Selecione a marca";
      if (!form.model) nextErrors.model = "Selecione o modelo";
      if (!form.year) nextErrors.year = "Selecione o ano";
      if (!form.fuel) nextErrors.fuel = "Selecione o combustível";
      if (!form.transmission) nextErrors.transmission = "Selecione o câmbio";
      if (!form.km) nextErrors.km = "Informe a quilometragem";
      if (!form.color) nextErrors.color = "Selecione a cor";
      if (!form.plateEnding) nextErrors.plateEnding = "Informe o final da placa";
    }
    if (targetStep === 2) {
      if (!form.bodyType) nextErrors.bodyType = "Selecione a carroceria";
      if (!form.ownerCount) nextErrors.ownerCount = "Selecione a quantidade de donos";
      if (!form.hasManual) nextErrors.hasManual = "Informe se tem manual";
      if (!form.hasSpareKey) nextErrors.hasSpareKey = "Informe se tem chave reserva";
      if (!form.desiredPrice) nextErrors.desiredPrice = "Informe o valor pretendido";
    }
    if (targetStep === 3 && !PHOTO_SLOTS.every((slot) => Boolean(form.photos[slot.id]))) nextErrors.photos = "Envie as 12 fotos obrigatórias do veículo.";
    if (targetStep === 4) {
      if (!form.fullName) nextErrors.fullName = "Informe seu nome";
      if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Informe um e-mail válido";
      if (!form.phone || form.phone.length < 10) nextErrors.phone = "Informe um telefone válido";
      if (!form.city) nextErrors.city = "Informe a cidade";
      if (!form.state) nextErrors.state = "Informe o estado";
      if (!form.contactPeriod) nextErrors.contactPeriod = "Selecione o melhor horário";
      if (!form.contactChannel) nextErrors.contactChannel = "Selecione o canal de contato";
    }
    if (targetStep === 5) {
      if (!form.acceptedTerms) nextErrors.acceptedTerms = "Aceite os termos para continuar";
      if (!form.acceptedLgpd) nextErrors.acceptedLgpd = "Aceite a política LGPD";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev));
  };

  const goBack = () => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));

  const resetWizard = () => {
    getPhotosList(photosRef.current).forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    photosRef.current = {};
    setForm(createInitialFormState());
    setErrors({});
    setStep(1);
    setProtocol(null);
  };

  const setSlotPhoto = (slotId: PhotoSlotId, file: File) => {
    if (!file.type.startsWith("image/")) return;
    setForm((prev) => {
      const previousPhoto = prev.photos[slotId];
      if (previousPhoto) URL.revokeObjectURL(previousPhoto.previewUrl);
      return {
        ...prev,
        photos: {
          ...prev.photos,
          [slotId]: {
            id: `${slotId}-${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
            file,
            previewUrl: URL.createObjectURL(file)
          }
        }
      };
    });
    clearError("photos");
  };

  const removePhoto = (slotId: PhotoSlotId) => {
    setForm((prev) => {
      const target = prev.photos[slotId];
      if (target) URL.revokeObjectURL(target.previewUrl);
      const nextPhotos = { ...prev.photos };
      delete nextPhotos[slotId];
      return { ...prev, photos: nextPhotos };
    });
  };

  const onInputPhoto = (slotId: PhotoSlotId, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSlotPhoto(slotId, file);
    event.target.value = "";
  };

  const onDropPhoto = (slotId: PhotoSlotId, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) setSlotPhoto(slotId, file);
  };

  const submit = async () => {
    if (!validateStep(5)) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(buildSellYourCarPayload(form)));

      for (const slot of PHOTO_SLOTS) {
        const photo = form.photos[slot.id];
        if (photo) formData.append(`photo_${slot.id}`, photo.file, photo.file.name);
      }

      const response = await fetch("/api/venda-seu-carro", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as SellYourCarSubmitResponse;

      if (!response.ok || !payload.ok || !payload.protocol) {
        throw new Error(payload.error || "Não foi possível enviar a avaliação.");
      }

      setProtocol(payload.protocol);
    } catch {
      setErrors((current) => ({
        ...current,
        submit: "Não foi possível enviar sua avaliação agora. Tente novamente em instantes."
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="sell-page">
      <div className="container sell-page-content">
        <article className="sell-page-hero">
          <div className="sell-page-hero-overlay">
            <h1>Venda seu carro</h1>
            <p>É rápido, seguro e sem complicação. Preencha os dados do seu veículo e receba uma avaliação justa.</p>
          </div>
          <Image src="/images/banner-venda-seu-carro.png" alt="Banner venda seu carro Savol" width={1916} height={821} className="sell-page-hero-image" priority />
        </article>

        <section className="sell-page-wizard">
          <header className="sell-page-wizard-head">
            <h2>Comece sua avaliação</h2>
            <p>Preencha as informações abaixo para receber uma avaliação rápida com segurança e transparência.</p>
          </header>

          <ol className="sell-stepper">
            {STEPS.map((item) => {
              const isCurrent = step === item.id;
              const isDone = item.id < step || (item.id === step && isStepDone(item.id));
              return (
                <li key={item.id}>
                  <button type="button" className={`sell-step-node${isCurrent ? " is-current" : ""}${isDone ? " is-done" : ""}`} onClick={() => (item.id <= step ? setStep(item.id) : validateStep(step) && setStep(item.id))}>
                    <span>{isDone ? <CheckCircle2 size={15} /> : item.id}</span>
                    <strong>{item.label}</strong>
                  </button>
                </li>
              );
            })}
          </ol>

          {protocol ? (
            <article className="sell-success-card">
              <CheckCircle2 size={32} />
              <h3>Solicitação enviada com sucesso</h3>
              <p>
                Recebemos seu pedido de avaliação. Protocolo <strong>{protocol}</strong>. Nossa equipe entrará em contato em breve.
              </p>
              <button type="button" className="btn btn-outline" onClick={resetWizard}>Enviar outro veículo</button>
            </article>
          ) : (
            <form className="sell-form" onSubmit={(event) => event.preventDefault()}>
              <div className="sell-form-main">
                <div className="sell-form-fields">
                  {step === 1 && (
                    <div className="sell-form-grid">
                      <label className="sell-field"><span>Marca *</span><select value={form.brand} onChange={(event) => { handleChange("brand", event.target.value); handleChange("model", ""); handleChange("version", ""); }}><option value="">Selecione</option>{brands.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.brand} /></label>
                      <label className="sell-field"><span>Modelo *</span><select value={form.model} onChange={(event) => { handleChange("model", event.target.value); handleChange("version", ""); }}><option value="">Selecione</option>{models.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.model} /></label>
                      <label className="sell-field"><span>Versão</span><select value={form.version} onChange={(event) => handleChange("version", event.target.value)}><option value="">Selecione</option>{versions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                      <label className="sell-field"><span>Ano *</span><select value={form.year} onChange={(event) => handleChange("year", event.target.value)}><option value="">Selecione</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.year} /></label>
                      <label className="sell-field"><span>Combustível *</span><select value={form.fuel} onChange={(event) => handleChange("fuel", event.target.value)}><option value="">Selecione</option>{FUEL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.fuel} /></label>
                      <label className="sell-field"><span>Câmbio *</span><select value={form.transmission} onChange={(event) => handleChange("transmission", event.target.value)}><option value="">Selecione</option>{TRANSMISSION_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.transmission} /></label>
                      <label className="sell-field"><span>Quilometragem *</span><input type="text" inputMode="numeric" placeholder="Ex.: 45000" value={form.km} onChange={(event) => handleChange("km", cleanDigits(event.target.value, 7))} /><FieldError error={errors.km} /></label>
                      <label className="sell-field"><span>Cor *</span><select value={form.color} onChange={(event) => handleChange("color", event.target.value)}><option value="">Selecione</option>{COLOR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.color} /></label>
                      <label className="sell-field"><span>Final da placa *</span><input type="text" placeholder="Ex.: 1A23" value={form.plateEnding} onChange={(event) => handleChange("plateEnding", cleanPlate(event.target.value))} /><FieldError error={errors.plateEnding} /></label>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="sell-form-grid">
                      <label className="sell-field"><span>Carroceria *</span><select value={form.bodyType} onChange={(event) => handleChange("bodyType", event.target.value)}><option value="">Selecione</option>{BODY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.bodyType} /></label>
                      <label className="sell-field"><span>Quantidade de donos *</span><select value={form.ownerCount} onChange={(event) => handleChange("ownerCount", event.target.value)}><option value="">Selecione</option>{OWNER_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.ownerCount} /></label>
                      <label className="sell-field"><span>Possui manual? *</span><select value={form.hasManual} onChange={(event) => handleChange("hasManual", event.target.value)}><option value="">Selecione</option>{YES_NO_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.hasManual} /></label>
                      <label className="sell-field"><span>Possui chave reserva? *</span><select value={form.hasSpareKey} onChange={(event) => handleChange("hasSpareKey", event.target.value)}><option value="">Selecione</option>{YES_NO_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.hasSpareKey} /></label>
                      <label className="sell-field"><span>Valor pretendido (R$) *</span><input type="text" inputMode="numeric" placeholder="Ex.: 95000" value={form.desiredPrice} onChange={(event) => handleChange("desiredPrice", cleanDigits(event.target.value, 9))} /><FieldError error={errors.desiredPrice} /></label>
                      <label className="sell-field sell-field--full"><span>Observações</span><textarea rows={4} placeholder="Conte o estado geral do veículo, histórico de revisões e diferenciais." value={form.notes} onChange={(event) => handleChange("notes", event.target.value.slice(0, 700))} /></label>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="sell-photos-step">
                      <p className="sell-photos-help">Envie uma foto para cada ângulo solicitado. São 12 fotos no total.</p>
                      <FieldError error={errors.photos} />
                      <div className="sell-photo-slot-grid">
                        {PHOTO_SLOTS.map((slot) => {
                          const photo = form.photos[slot.id];
                          return (
                            <label
                              key={slot.id}
                              className={`sell-photo-slot${photo ? " has-photo" : ""}${dragActive ? " is-drag-active" : ""}`}
                              onDrop={(event) => onDropPhoto(slot.id, event)}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setDragActive(true);
                              }}
                              onDragLeave={() => setDragActive(false)}
                            >
                              <input type="file" accept="image/*" onChange={(event) => onInputPhoto(slot.id, event)} />
                              {photo ? (
                                <>
                                  <Image src={photo.previewUrl} alt={slot.label} width={240} height={160} unoptimized />
                                  <button type="button" onClick={(event) => { event.preventDefault(); removePhoto(slot.id); }} aria-label={`Remover foto ${slot.label}`}>
                                    <X size={14} />
                                  </button>
                                </>
                              ) : (
                                <span className="sell-photo-slot-empty">
                                  <Upload size={22} />
                                  <small>Clique ou arraste</small>
                                </span>
                              )}
                              <strong>{slot.label}</strong>
                            </label>
                          );
                        })}
                      </div>
                      <p className="sell-photos-counter">{getPhotosList(form.photos).length} de {PHOTO_SLOTS.length} fotos enviadas</p>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="sell-form-grid">
                      <label className="sell-field"><span>Nome completo *</span><input type="text" value={form.fullName} onChange={(event) => handleChange("fullName", event.target.value)} /><FieldError error={errors.fullName} /></label>
                      <label className="sell-field"><span>E-mail *</span><input type="email" value={form.email} onChange={(event) => handleChange("email", event.target.value)} /><FieldError error={errors.email} /></label>
                      <label className="sell-field"><span>Telefone *</span><input type="tel" inputMode="numeric" value={form.phone} onChange={(event) => handleChange("phone", cleanDigits(event.target.value, 11))} /><FieldError error={errors.phone} /></label>
                      <label className="sell-field"><span>WhatsApp</span><input type="tel" inputMode="numeric" value={form.whatsapp} onChange={(event) => handleChange("whatsapp", cleanDigits(event.target.value, 11))} /></label>
                      <label className="sell-field"><span>Cidade *</span><input type="text" value={form.city} onChange={(event) => handleChange("city", event.target.value)} /><FieldError error={errors.city} /></label>
                      <label className="sell-field"><span>Estado *</span><input type="text" value={form.state} onChange={(event) => handleChange("state", event.target.value.toUpperCase().slice(0, 2))} /><FieldError error={errors.state} /></label>
                      <label className="sell-field"><span>Melhor horário *</span><select value={form.contactPeriod} onChange={(event) => handleChange("contactPeriod", event.target.value)}><option value="">Selecione</option>{CONTACT_PERIOD_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.contactPeriod} /></label>
                      <label className="sell-field"><span>Canal preferencial *</span><select value={form.contactChannel} onChange={(event) => handleChange("contactChannel", event.target.value)}><option value="">Selecione</option>{CONTACT_CHANNEL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.contactChannel} /></label>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="sell-form-grid">
                      <div className="sell-review-grid">
                        <article><h4>Veículo</h4><ul><li><strong>Marca:</strong> {form.brand || "-"}</li><li><strong>Modelo:</strong> {form.model || "-"}</li><li><strong>Ano:</strong> {form.year || "-"}</li><li><strong>KM:</strong> {form.km || "-"}</li><li><strong>Combustível:</strong> {form.fuel || "-"}</li><li><strong>Câmbio:</strong> {form.transmission || "-"}</li><li><strong>Cor:</strong> {form.color || "-"}</li></ul></article>
                        <article><h4>Contato</h4><ul><li><strong>Nome:</strong> {form.fullName || "-"}</li><li><strong>E-mail:</strong> {form.email || "-"}</li><li><strong>Telefone:</strong> {form.phone || "-"}</li><li><strong>Cidade/UF:</strong> {form.city ? `${form.city}/${form.state}` : "-"}</li><li><strong>Canal:</strong> {form.contactChannel || "-"}</li><li><strong>Fotos:</strong> {getPhotosList(form.photos).length}</li><li><strong>Valor:</strong> {form.desiredPrice ? `R$ ${form.desiredPrice}` : "-"}</li></ul></article>
                      </div>
                      <label className="sell-check"><input type="checkbox" checked={form.acceptedTerms} onChange={(event) => handleChange("acceptedTerms", event.target.checked)} /><span>Li e concordo com os termos de atendimento.</span></label>
                      <FieldError error={errors.acceptedTerms} />
                      <label className="sell-check"><input type="checkbox" checked={form.acceptedLgpd} onChange={(event) => handleChange("acceptedLgpd", event.target.checked)} /><span>Autorizo o uso dos dados para contato conforme LGPD.</span></label>
                      <FieldError error={errors.acceptedLgpd} />
                    </div>
                  )}
                </div>

                <aside className="sell-security-card">
                  <Image src="/images/fit.png" alt="Processo seguro Savol" width={777} height={474} className="sell-security-image" />
                  <h4>Processo 100% seguro</h4>
                  <ul>
                    <li><CheckCircle2 size={16} /> Avaliação rápida e gratuita</li>
                    <li><CheckCircle2 size={16} /> Seus dados protegidos</li>
                    <li><CheckCircle2 size={16} /> Sem compromisso</li>
                    <li><CheckCircle2 size={16} /> Atendimento especializado</li>
                  </ul>
                </aside>
              </div>

              <footer className="sell-form-footer">
                <FieldError error={errors.submit} />
                <button type="button" className="btn btn-outline" onClick={resetWizard}>Cancelar</button>
                <div className="sell-form-footer-right">
                  {step > 1 && <button type="button" className="btn btn-outline" onClick={goBack}><ChevronLeft size={16} /> Voltar</button>}
                  {step < 5 ? <button type="button" className="btn" onClick={goNext}>Continuar <ChevronRight size={16} /></button> : <button type="button" className="btn" onClick={submit} disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Enviar avaliação"} <ArrowRight size={16} /></button>}
                </div>
              </footer>
            </form>
          )}

          <section className="sell-proof">
            <article className="sell-proof-main"><div className="sell-proof-icon"><CheckCircle2 size={24} /></div><div><h3>Por que vender com a Savol?</h3><p>Somos referência em seminovos e oferecemos negociação transparente com suporte completo.</p></div></article>
            <article><strong>+15</strong><span>anos de experiência</span></article>
            <article><strong>+10 mil</strong><span>negociações realizadas</span></article>
            <article><strong>100%</strong><span>avaliação justa e transparente</span></article>
          </section>

          <section className="sell-advantage-grid">
            <article><span><Calendar size={17} /></span><div><strong>Avaliação rápida</strong><p>Resposta em pouco tempo.</p></div></article>
            <article><span><ShieldCheck size={17} /></span><div><strong>100% seguro</strong><p>Dados protegidos e processo claro.</p></div></article>
            <article><span><CircleDollarSign size={17} /></span><div><strong>Melhor oferta</strong><p>Avaliação justa para seu carro.</p></div></article>
            <article><span><Store size={17} /></span><div><strong>Rede Savol</strong><p>Mais de 15 lojas para vender rápido.</p></div></article>
          </section>

          <section className="sell-summary-bar">
            <p><strong>{STEPS.filter((item) => isStepDone(item.id)).length}</strong> de {STEPS.length} etapas concluídas</p>
            <div className="sell-summary-icons"><Calendar size={15} /><Gauge size={15} /><Fuel size={15} /><Palette size={15} /><Settings2 size={15} /><Camera size={15} /><UserRound size={15} /><Mail size={15} /><Phone size={15} /><MapPin size={15} /></div>
          </section>
        </section>
      </div>
    </section>
  );
}
