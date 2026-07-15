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
import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from "react";
import { logLeadPayload } from "@/lib/leadDebug";
import { getLeadTrackingPayload } from "@/lib/leadTracking";
import { parseCurrencyToInteger } from "@/utils/pricing";

type Step = 1 | 2 | 3 | 4 | 5;

type UploadedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type PhotoSlotId =
  | "vehicle"
  | "documentFront"
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
  plate: string;
  brand: string;
  model: string;
  version: string;
  modelYear: string;
  manufactureYear: string;
  km: string;
  color: string;
  desiredPrice: string;
  photos: Partial<Record<PhotoSlotId, UploadedPhoto>>;
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  acceptedTerms: boolean;
  acceptedLgpd: boolean;
};

type SellYourCarSubmitResponse = {
  ok?: boolean;
  protocol?: string;
  error?: string;
};

type PlateLookupVehicle = Partial<Pick<SellFormData, "plate" | "brand" | "model" | "version" | "modelYear" | "manufactureYear" | "color">>;

type PlateLookupResponse = {
  ok?: boolean;
  vehicle?: PlateLookupVehicle;
  error?: string;
};

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 1, label: "Placa" },
  { id: 2, label: "Dados do veículo" },
  { id: 3, label: "Fotos e documento" },
  { id: 4, label: "Seus dados" },
  { id: 5, label: "Confirmação" }
];

const PHOTO_SLOTS: Array<{ id: PhotoSlotId; label: string; required: boolean }> = [
  { id: "vehicle", label: "FOTO FRENTE VEÍCULO", required: true },
  { id: "documentFront", label: "Frente do documento", required: true },
  { id: "odometer", label: "Hodômetro", required: true },
  { id: "front", label: "Frente do veículo", required: false },
  { id: "leftSide", label: "Lateral esquerda", required: false },
  { id: "rightSide", label: "Lateral direita", required: false },
  { id: "rear", label: "Traseira", required: false },
  { id: "dashboard", label: "Painel", required: false },
  { id: "spare", label: "Estepe", required: false },
  { id: "trunk", label: "Porta-malas", required: false },
  { id: "roof", label: "Teto", required: false },
  { id: "tire", label: "Pneu", required: false },
  { id: "engine", label: "Motor", required: false },
  { id: "chassis", label: "Chassi", required: false }
];

const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 0.72;
const TARGET_IMAGE_MAX_BYTES = 900 * 1024;
const MAX_DESIRED_PRICE = 999999999;


function createInitialFormState(): SellFormData {
  return {
    plate: "",
    brand: "",
    model: "",
    version: "",
    modelYear: "",
    manufactureYear: "",
    km: "",
    color: "",
    desiredPrice: "",
    photos: {},
    fullName: "",
    email: "",
    phone: "",
    cpf: "",
    acceptedTerms: false,
    acceptedLgpd: false
  };
}


function cleanDigits(value: string, max: number): string {
  return value.replace(/[^\d]/g, "").slice(0, max);
}

function cleanPlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function getPlateKind(plate: string): "mercosul" | "old" | "unknown" {
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate)) return "mercosul";
  if (/^[A-Z]{3}\d{4}$/.test(plate)) return "old";
  return "unknown";
}

function formatPlateDisplay(plate: string): string {
  if (getPlateKind(plate) === "old" && plate.length === 7) return `${plate.slice(0, 3)}-${plate.slice(3)}`;
  return plate;
}


function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <small className="sell-field-help">{error}</small>;
}

function getPhotosList(photos: SellFormData["photos"]): UploadedPhoto[] {
  return PHOTO_SLOTS.map((slot) => photos[slot.id]).filter((photo): photo is UploadedPhoto => Boolean(photo));
}

function toNumberValue(value: string): number | null {
  return parseCurrencyToInteger(value);
}

function formatCurrencyInput(value: string): string {
  const numericValue = toNumberValue(value);
  if (!numericValue) return "";
  if (numericValue > MAX_DESIRED_PRICE) return formatCurrencyInput(String(MAX_DESIRED_PRICE));
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericValue);
}

function getCurrencyInputEvent(event: ChangeEvent<HTMLInputElement>): InputEvent | null {
  return typeof InputEvent !== "undefined" && event.nativeEvent instanceof InputEvent ? event.nativeEvent : null;
}

function resolveCurrencyInputValue(currentValue: string, event: ChangeEvent<HTMLInputElement>): string {
  const inputEvent = getCurrencyInputEvent(event);
  const currentDigits = String(toNumberValue(currentValue) ?? "");

  if (inputEvent?.inputType.startsWith("deleteContent")) {
    return formatCurrencyInput(currentDigits.slice(0, -1));
  }

  if (inputEvent?.inputType === "insertText" && /^\d$/.test(inputEvent.data ?? "")) {
    return formatCurrencyInput(`${currentDigits}${inputEvent.data}`);
  }

  return formatCurrencyInput(event.target.value);
}

function blobToFile(blob: Blob, originalFile: File): File {
  const baseName = originalFile.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("image-load"));
      element.src = imageUrl;
    });

    let maxDimension = MAX_IMAGE_DIMENSION;
    let quality = IMAGE_QUALITY;
    let blob: Blob | null = null;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return file;

    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob || blob.size <= TARGET_IMAGE_MAX_BYTES) break;
      maxDimension = Math.round(maxDimension * 0.82);
      quality = Math.max(0.52, quality - 0.08);
    }

    if (!blob) return file;
    if (blob.size >= file.size && file.size <= TARGET_IMAGE_MAX_BYTES) return file;

    return blobToFile(blob, file);
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function buildSellYourCarPayload(form: SellFormData) {
  const submittedAt = new Date().toISOString();
  const tracking = getLeadTrackingPayload({
    form: "venda-seu-carro",
    plate: form.plate,
    brand: form.brand,
    model: form.model,
    version: form.version
  });

  return {
    schemaVersion: "1.0",
    source: {
      form: "venda-seu-carro",
      channel: "site",
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      submittedAt
    },
    utm: tracking.utm,
    meta: tracking.meta,
    vehicle: {
      plate: form.plate,
      brand: form.brand,
      model: form.model,
      version: form.version,
      year: form.modelYear,
      modelYear: form.modelYear,
      manufactureYear: form.manufactureYear,
      km: toNumberValue(form.km),
      color: form.color,
      plateEnding: form.plate.slice(-4),
      desiredPrice: toNumberValue(form.desiredPrice)
    },
    seller: {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone,
      cpf: form.cpf
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
        required: slot.required,
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
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<SellFormData>(createInitialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plateLookupStatus, setPlateLookupStatus] = useState<"idle" | "loading" | "found" | "not-found" | "error">("idle");
  const [plateLookupMessage, setPlateLookupMessage] = useState("");
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

  useEffect(() => {
    if (form.plate.length !== 7) {
      setPlateLookupStatus("idle");
      setPlateLookupMessage("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPlateLookupStatus("loading");
      setPlateLookupMessage("Consultando dados do veiculo...");

      fetch(`/api/venda-seu-carro/placa?placa=${encodeURIComponent(form.plate)}`, {
        method: "GET",
        signal: controller.signal
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => ({}))) as PlateLookupResponse;
          if (!response.ok || !payload.ok || !payload.vehicle) {
            throw new Error(payload.error || "lookup");
          }

          const vehicle = payload.vehicle;
          const hasData = Boolean(vehicle.brand || vehicle.model || vehicle.version || vehicle.modelYear || vehicle.manufactureYear || vehicle.color);
          setForm((current) => {
            if (current.plate !== form.plate) return current;
            return {
              ...current,
              brand: vehicle.brand || current.brand,
              model: vehicle.model || current.model,
              version: vehicle.version || current.version,
              modelYear: vehicle.modelYear || current.modelYear,
              manufactureYear: vehicle.manufactureYear || current.manufactureYear,
              color: vehicle.color || current.color
            };
          });
          setPlateLookupStatus(hasData ? "found" : "not-found");
          setPlateLookupMessage(hasData ? "Dados encontrados. Revise e complete o que faltar." : "Placa consultada. Complete os dados do veiculo.");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setPlateLookupStatus("error");
          setPlateLookupMessage("Nao conseguimos consultar essa placa agora. Voce pode continuar preenchendo manualmente.");
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.plate]);


  const isStepDone = (checkStep: Step): boolean => {
    if (checkStep === 1) return form.plate.length === 7;
    if (checkStep === 2) return Boolean(form.brand && form.model && form.version && form.modelYear && form.manufactureYear && form.km && form.color && form.desiredPrice);
    if (checkStep === 3) return PHOTO_SLOTS.filter((slot) => slot.required).every((slot) => Boolean(form.photos[slot.id]));
    if (checkStep === 4) return Boolean(form.fullName && form.email && form.phone && form.cpf);
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
      if (form.plate.length !== 7) nextErrors.plate = "Informe a placa completa";
    }
    if (targetStep === 2) {
      if (!form.brand) nextErrors.brand = "Informe a marca";
      if (!form.model) nextErrors.model = "Informe o modelo";
      if (!form.version) nextErrors.version = "Informe a versão";
      if (!form.modelYear) nextErrors.modelYear = "Informe o ano modelo";
      if (!form.manufactureYear) nextErrors.manufactureYear = "Informe o ano de fabricação";
      if (!form.km) nextErrors.km = "Informe a quilometragem";
      if (!form.color) nextErrors.color = "Informe a cor";
      if (!form.desiredPrice) nextErrors.desiredPrice = "Informe o valor pretendido";
    }
    if (targetStep === 3 && !PHOTO_SLOTS.filter((slot) => slot.required).every((slot) => Boolean(form.photos[slot.id]))) nextErrors.photos = "Envie as fotos obrigatórias: carro, frente do documento e hodômetro.";
    if (targetStep === 4) {
      if (!form.fullName) nextErrors.fullName = "Informe seu nome";
      if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Informe um e-mail válido";
      if (!form.phone || form.phone.replace(/[^\d]/g, "").length < 10) nextErrors.phone = "Informe um telefone válido";
      if (!form.cpf || form.cpf.replace(/[^\d]/g, "").length !== 11) nextErrors.cpf = "Informe um CPF válido";
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

  const goToStep = (targetStep: Step) => {
    if (targetStep <= step) {
      setStep(targetStep);
      return;
    }

    if (!validateStep(step)) return;
    setStep((step + 1) as Step);
  };

  const resetWizard = () => {
    getPhotosList(photosRef.current).forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    photosRef.current = {};
    setForm(createInitialFormState());
    setErrors({});
    setStep(1);
    setProtocol(null);
  };

  const setSlotPhoto = async (slotId: PhotoSlotId, file: File) => {
    if (!file.type.startsWith("image/")) return;
    const preparedFile = await compressImageFile(file);
    setForm((prev) => {
      const previousPhoto = prev.photos[slotId];
      if (previousPhoto) URL.revokeObjectURL(previousPhoto.previewUrl);
      return {
        ...prev,
        photos: {
          ...prev.photos,
          [slotId]: {
            id: `${slotId}-${preparedFile.name}-${preparedFile.size}-${preparedFile.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
            file: preparedFile,
            previewUrl: URL.createObjectURL(preparedFile)
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
    if (file) void setSlotPhoto(slotId, file);
    event.target.value = "";
  };

  const onDropPhoto = (slotId: PhotoSlotId, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void setSlotPhoto(slotId, file);
  };

  const submit = async () => {
    if (!validateStep(5)) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      const leadPayload = buildSellYourCarPayload(form);
      logLeadPayload("venda-seu-carro", leadPayload);
      formData.append("payload", JSON.stringify(leadPayload));

      for (const slot of PHOTO_SLOTS) {
        const photo = form.photos[slot.id];
        if (photo) formData.append(`photo_${slot.id}`, photo.file, photo.file.name);
      }

      const response = await fetch("/api/venda-seu-carro", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as SellYourCarSubmitResponse;
      const finalLeadmobPayload = (payload as { leadmob?: { request?: unknown } }).leadmob?.request;
      if (finalLeadmobPayload) logLeadPayload("venda-seu-carro final payload", finalLeadmobPayload);
      logLeadPayload("venda-seu-carro resposta", payload);

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

  const plateKind = getPlateKind(form.plate);
  const plateVisualClass = plateKind === "old" ? "sell-plate-frame--old" : "sell-plate-frame--mercosul";
  const plateRegionLabel = plateKind === "old" ? "SANTO ANDRÉ - SP" : "BRASIL";
  const plateKindLabel = plateKind === "old" ? "Placa cinza" : "Placa Mercosul";

  return (
    <section className="sell-page">
      <div className="container sell-page-content">
        <article className="sell-page-hero">
          <div className="sell-page-hero-overlay">
            <h1>Venda seu carro</h1>
            <p>É rápido, seguro e sem complicação. Preencha os dados do seu veículo e receba uma avaliação justa.</p>
          </div>
          <Image src="/images/banner-venda-seu-carro.png" alt="Banner venda seu carro SAVOL" width={1916} height={821} className="sell-page-hero-image" priority />
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
                  <button type="button" className={`sell-step-node${isCurrent ? " is-current" : ""}${isDone ? " is-done" : ""}`} onClick={() => goToStep(item.id)}>
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
              <div className={`sell-form-main${step === 1 ? " sell-form-main--plate" : ""}`}>
                <div className="sell-form-fields">
                  {step === 1 && (
                    <div className="sell-plate-step">
                      <div className={`sell-plate-frame ${plateVisualClass}`}>
                        <div className="sell-plate-top">
                          <span>{plateRegionLabel}</span>
                          {plateKind !== "old" ? <strong>BR</strong> : null}
                        </div>
                        <input
                          type="text"
                          inputMode="text"
                          aria-label="Placa do veículo"
                          placeholder={plateKind === "old" ? "ABC1234" : "ABC1D23"}
                          value={formatPlateDisplay(form.plate)}
                          onChange={(event) => handleChange("plate", cleanPlate(event.target.value))}
                        />
                      </div>
                      <FieldError error={errors.plate} />
                      <p className="sell-plate-caption">{form.plate.length === 7 ? `${plateKindLabel} identificada. Continue para preencher os dados do veículo.` : "Digite a placa completa para começar a avaliação."}</p>
                      {plateLookupStatus !== "idle" ? (
                        <p className={`sell-plate-lookup sell-plate-lookup--${plateLookupStatus}`}>{plateLookupMessage}</p>
                      ) : null}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="sell-form-grid">
                      <label className="sell-field"><span>Marca *</span><input type="text" placeholder="Ex.: Toyota" value={form.brand} onChange={(event) => handleChange("brand", event.target.value)} /><FieldError error={errors.brand} /></label>
                      <label className="sell-field"><span>Modelo *</span><input type="text" placeholder="Ex.: Corolla" value={form.model} onChange={(event) => handleChange("model", event.target.value)} /><FieldError error={errors.model} /></label>
                      <label className="sell-field"><span>Versao *</span><input type="text" placeholder="Ex.: XEi 2.0" value={form.version} onChange={(event) => handleChange("version", event.target.value)} /><FieldError error={errors.version} /></label>
                      <label className="sell-field"><span>Ano modelo *</span><input type="text" placeholder="Ex.: 2022" value={form.modelYear} onChange={(event) => handleChange("modelYear", event.target.value)} /><FieldError error={errors.modelYear} /></label>
                      <label className="sell-field"><span>Ano fabricacao *</span><input type="text" placeholder="Ex.: 2021" value={form.manufactureYear} onChange={(event) => handleChange("manufactureYear", event.target.value)} /><FieldError error={errors.manufactureYear} /></label>
                      <label className="sell-field"><span>Quilometragem *</span><input type="text" placeholder="Ex.: 45000" value={form.km} onChange={(event) => handleChange("km", event.target.value)} /><FieldError error={errors.km} /></label>
                      <label className="sell-field"><span>Cor *</span><input type="text" placeholder="Ex.: Prata" value={form.color} onChange={(event) => handleChange("color", event.target.value)} /><FieldError error={errors.color} /></label>
                      <label className="sell-field"><span>Valor pretendido *</span><input type="text" inputMode="numeric" placeholder="Ex.: R$ 95.000,00" value={form.desiredPrice} onChange={(event) => handleChange("desiredPrice", resolveCurrencyInputValue(form.desiredPrice, event))} /><FieldError error={errors.desiredPrice} /></label>
                      <label className="sell-field"><span>Placa</span><input type="text" value={formatPlateDisplay(form.plate)} readOnly /></label>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="sell-photos-step">
                      <p className="sell-photos-help">Envie as 3 fotos obrigatórias. Se quiser, adicione fotos opcionais para ajudar na avaliação.</p>
                      <FieldError error={errors.photos} />
                      <div className="sell-photo-slot-grid">
                        {PHOTO_SLOTS.map((slot) => {
                          const photo = form.photos[slot.id];
                          return (
                            <label
                              key={slot.id}
                              className={`sell-photo-slot${slot.required ? " is-required" : ""}${photo ? " has-photo" : ""}${dragActive ? " is-drag-active" : ""}`}
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
                              <strong>
                                <span>{slot.label}</span>
                                {slot.required ? <em>(Obrigatório)</em> : null}
                              </strong>
                            </label>
                          );
                        })}
                      </div>
                      <p className="sell-photos-counter">{getPhotosList(form.photos).length} fotos enviadas</p>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="sell-form-grid">
                      <label className="sell-field"><span>Nome completo *</span><input type="text" value={form.fullName} onChange={(event) => handleChange("fullName", event.target.value)} /><FieldError error={errors.fullName} /></label>
                      <label className="sell-field"><span>E-mail *</span><input type="text" value={form.email} onChange={(event) => handleChange("email", event.target.value)} /><FieldError error={errors.email} /></label>
                      <label className="sell-field"><span>Telefone *</span><input type="text" value={form.phone} onChange={(event) => handleChange("phone", event.target.value)} /><FieldError error={errors.phone} /></label>
                      <label className="sell-field"><span>CPF *</span><input type="text" value={form.cpf} onChange={(event) => handleChange("cpf", event.target.value)} /><FieldError error={errors.cpf} /></label>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="sell-form-grid">
                      <div className="sell-review-grid">
                        <article><h4>Veiculo</h4><ul><li><strong>Placa:</strong> {formatPlateDisplay(form.plate) || "-"}</li><li><strong>Marca:</strong> {form.brand || "-"}</li><li><strong>Modelo:</strong> {form.model || "-"}</li><li><strong>Versao:</strong> {form.version || "-"}</li><li><strong>Ano modelo:</strong> {form.modelYear || "-"}</li><li><strong>Ano fabricacao:</strong> {form.manufactureYear || "-"}</li><li><strong>KM:</strong> {form.km || "-"}</li><li><strong>Cor:</strong> {form.color || "-"}</li><li><strong>Valor:</strong> {form.desiredPrice || "-"}</li></ul></article>
                        <article><h4>Contato</h4><ul><li><strong>Nome:</strong> {form.fullName || "-"}</li><li><strong>E-mail:</strong> {form.email || "-"}</li><li><strong>Telefone:</strong> {form.phone || "-"}</li><li><strong>CPF:</strong> {form.cpf || "-"}</li><li><strong>Fotos:</strong> {getPhotosList(form.photos).length}</li></ul></article>
                      </div>
                      <label className="sell-check"><input type="checkbox" checked={form.acceptedTerms} onChange={(event) => handleChange("acceptedTerms", event.target.checked)} /><span>Li e concordo com os termos de atendimento.</span></label>
                      <FieldError error={errors.acceptedTerms} />
                      <label className="sell-check"><input type="checkbox" checked={form.acceptedLgpd} onChange={(event) => handleChange("acceptedLgpd", event.target.checked)} /><span>Autorizo o uso dos dados para contato conforme LGPD.</span></label>
                      <FieldError error={errors.acceptedLgpd} />
                    </div>
                  )}
                </div>

                <aside className="sell-security-card">
                  <Image src="/images/fit.png" alt="Processo seguro SAVOL" width={777} height={474} className="sell-security-image" />
                  <h4>Processo seguro</h4>
                  <ul>
                    <li><CheckCircle2 size={16} /> Avaliação rápida e gratuita</li>
                    <li><CheckCircle2 size={16} /> Seus dados protegidos</li>
                    <li><CheckCircle2 size={16} /> Sem compromisso</li>
                    <li><CheckCircle2 size={16} /> Atendimento especializado</li>
                  </ul>
                </aside>
              </div>

              <footer className={`sell-form-footer${step === 1 ? " sell-form-footer--plate" : ""}`}>
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
            <article className="sell-proof-main"><div className="sell-proof-icon"><CheckCircle2 size={24} /></div><div><h3>Por que vender com a SAVOL?</h3><p>Somos referência em seminovos e oferecemos negociação transparente com suporte completo.</p></div></article>
            <article><strong>63</strong><span>anos de experiência</span></article>
            <article><strong>Milhares</strong><span>de negociações realizadas</span></article>
            <article><strong>Processo</strong><span>claro e transparente</span></article>
          </section>

          <section className="sell-advantage-grid">
            <article><span><Calendar size={17} /></span><div><strong>Avaliação rápida</strong><p>Resposta em pouco tempo.</p></div></article>
            <article><span><ShieldCheck size={17} /></span><div><strong>Processo seguro</strong><p>Dados protegidos e processo claro.</p></div></article>
            <article><span><CircleDollarSign size={17} /></span><div><strong>Oferta transparente</strong><p>Avaliação justa para seu carro.</p></div></article>
            <article><span><Store size={17} /></span><div><strong>Grupo SAVOL</strong><p>Divulgação com suporte da nossa equipe.</p></div></article>
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
