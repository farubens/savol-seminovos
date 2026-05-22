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
  photos: UploadedPhoto[];
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

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 1, label: "Dados do veiculo" },
  { id: 2, label: "Detalhes adicionais" },
  { id: 3, label: "Fotos do veiculo" },
  { id: 4, label: "Seus dados" },
  { id: 5, label: "Confirmacao" }
];

const FUEL_OPTIONS = ["Flex", "Gasolina", "Etanol", "Diesel", "Hibrido", "Eletrico"];
const TRANSMISSION_OPTIONS = ["Manual", "Automatica", "CVT", "Automatizada"];
const COLOR_OPTIONS = ["Branco", "Prata", "Preto", "Cinza", "Azul", "Vermelho", "Verde", "Marrom"];
const BODY_OPTIONS = ["Hatch", "Sedan", "SUV", "Picape", "Crossover", "Van", "Utilitario"];
const OWNER_OPTIONS = ["Unico dono", "2 donos", "3 donos", "4 ou mais"];
const YES_NO_OPTIONS = ["Sim", "Nao"];
const CONTACT_PERIOD_OPTIONS = ["Manha", "Tarde", "Noite", "Qualquer horario"];
const CONTACT_CHANNEL_OPTIONS = ["WhatsApp", "Ligacao", "Email"];
const DEFAULT_BRANDS = ["Chevrolet", "Fiat", "Ford", "Honda", "Hyundai", "Jeep", "Kia", "Nissan", "Peugeot", "Toyota", "Volkswagen"];
const DEFAULT_MODELS = ["Onix", "Toro", "HB20", "Corolla", "Compass", "Kicks"];
const DEFAULT_VERSIONS = ["1.0", "1.3 Turbo", "2.0", "EX", "Limited"];
const DEFAULT_YEARS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010"];

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
    photos: [],
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

export function SellYourCarWizard() {
  const { vehicles } = useHomeSessionData();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<SellFormData>(createInitialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<UploadedPhoto[]>([]);

  useEffect(() => {
    photosRef.current = form.photos;
  }, [form.photos]);

  useEffect(() => () => {
    photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
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
    if (checkStep === 3) return form.photos.length >= 3;
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
      if (!form.fuel) nextErrors.fuel = "Selecione o combustivel";
      if (!form.transmission) nextErrors.transmission = "Selecione o cambio";
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
    if (targetStep === 3 && form.photos.length < 3) nextErrors.photos = "Envie no minimo 3 fotos";
    if (targetStep === 4) {
      if (!form.fullName) nextErrors.fullName = "Informe seu nome";
      if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Informe um e-mail valido";
      if (!form.phone || form.phone.length < 10) nextErrors.phone = "Informe um telefone valido";
      if (!form.city) nextErrors.city = "Informe a cidade";
      if (!form.state) nextErrors.state = "Informe o estado";
      if (!form.contactPeriod) nextErrors.contactPeriod = "Selecione o melhor horario";
      if (!form.contactChannel) nextErrors.contactChannel = "Selecione o canal de contato";
    }
    if (targetStep === 5) {
      if (!form.acceptedTerms) nextErrors.acceptedTerms = "Aceite os termos para continuar";
      if (!form.acceptedLgpd) nextErrors.acceptedLgpd = "Aceite a politica LGPD";
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
    photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    photosRef.current = [];
    setForm(createInitialFormState());
    setErrors({});
    setStep(1);
    setProtocol(null);
  };

  const appendPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const incoming = Array.from(files).filter((file) => file.type.startsWith("image/"));
    setForm((prev) => {
      const slots = Math.max(0, 12 - prev.photos.length);
      const next = incoming.slice(0, slots).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file)
      }));
      return { ...prev, photos: [...prev.photos, ...next] };
    });
    clearError("photos");
  };

  const removePhoto = (id: string) => {
    setForm((prev) => {
      const target = prev.photos.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return { ...prev, photos: prev.photos.filter((photo) => photo.id !== id) };
    });
  };

  const onInputPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    appendPhotos(event.target.files);
    event.target.value = "";
  };

  const onDropPhotos = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    appendPhotos(event.dataTransfer.files);
  };

  const submit = async () => {
    if (!validateStep(5)) return;
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setProtocol(`SAVOL-${Math.floor(100000 + Math.random() * 900000)}`);
    setIsSubmitting(false);
  };

  return (
    <section className="sell-page">
      <div className="container sell-page-content">
        <article className="sell-page-hero">
          <div className="sell-page-hero-overlay">
            <h1>Venda seu carro</h1>
            <p>E rapido, seguro e sem complicacao. Preencha os dados do seu veiculo e receba uma avaliacao justa.</p>
          </div>
          <Image src="/images/banner-venda-seu-carro.png" alt="Banner venda seu carro Savol" width={1916} height={821} className="sell-page-hero-image" priority />
        </article>

        <section className="sell-page-wizard">
          <header className="sell-page-wizard-head">
            <h2>Comece sua avaliacao</h2>
            <p>Preencha as informacoes abaixo para receber uma avaliacao rapida com seguranca e transparencia.</p>
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
              <h3>Solicitacao enviada com sucesso</h3>
              <p>
                Recebemos seu pedido de avaliacao. Protocolo <strong>{protocol}</strong>. Nossa equipe entrara em contato em breve.
              </p>
              <button type="button" className="btn btn-outline" onClick={resetWizard}>Enviar outro veiculo</button>
            </article>
          ) : (
            <form className="sell-form" onSubmit={(event) => event.preventDefault()}>
              <div className="sell-form-main">
                <div className="sell-form-fields">
                  {step === 1 && (
                    <div className="sell-form-grid">
                      <label className="sell-field"><span>Marca *</span><select value={form.brand} onChange={(event) => { handleChange("brand", event.target.value); handleChange("model", ""); handleChange("version", ""); }}><option value="">Selecione</option>{brands.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.brand} /></label>
                      <label className="sell-field"><span>Modelo *</span><select value={form.model} onChange={(event) => { handleChange("model", event.target.value); handleChange("version", ""); }}><option value="">Selecione</option>{models.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.model} /></label>
                      <label className="sell-field"><span>Versao</span><select value={form.version} onChange={(event) => handleChange("version", event.target.value)}><option value="">Selecione</option>{versions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                      <label className="sell-field"><span>Ano *</span><select value={form.year} onChange={(event) => handleChange("year", event.target.value)}><option value="">Selecione</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.year} /></label>
                      <label className="sell-field"><span>Combustivel *</span><select value={form.fuel} onChange={(event) => handleChange("fuel", event.target.value)}><option value="">Selecione</option>{FUEL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.fuel} /></label>
                      <label className="sell-field"><span>Cambio *</span><select value={form.transmission} onChange={(event) => handleChange("transmission", event.target.value)}><option value="">Selecione</option>{TRANSMISSION_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.transmission} /></label>
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
                      <label className="sell-field sell-field--full"><span>Observacoes</span><textarea rows={4} placeholder="Conte o estado geral do veiculo, historico de revisoes e diferenciais." value={form.notes} onChange={(event) => handleChange("notes", event.target.value.slice(0, 700))} /></label>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="sell-form-grid">
                      <div className={`sell-dropzone${dragActive ? " is-drag-active" : ""}`} onDrop={onDropPhotos} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInputRef.current?.click(); } }}>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="sell-dropzone-input" onChange={onInputPhotos} />
                        <Upload size={24} /><strong>Clique ou arraste as fotos do veiculo</strong><span>Envie de 3 a 12 imagens.</span>
                      </div>
                      <FieldError error={errors.photos} />
                      <div className="sell-photo-grid">
                        {form.photos.map((photo) => (
                          <figure key={photo.id} className="sell-photo-item">
                            <Image src={photo.previewUrl} alt={photo.file.name} width={240} height={160} unoptimized />
                            <figcaption><span>{photo.file.name}</span><button type="button" onClick={() => removePhoto(photo.id)} aria-label="Remover foto"><X size={14} /></button></figcaption>
                          </figure>
                        ))}
                      </div>
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
                      <label className="sell-field"><span>Melhor horario *</span><select value={form.contactPeriod} onChange={(event) => handleChange("contactPeriod", event.target.value)}><option value="">Selecione</option>{CONTACT_PERIOD_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.contactPeriod} /></label>
                      <label className="sell-field"><span>Canal preferencial *</span><select value={form.contactChannel} onChange={(event) => handleChange("contactChannel", event.target.value)}><option value="">Selecione</option>{CONTACT_CHANNEL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError error={errors.contactChannel} /></label>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="sell-form-grid">
                      <div className="sell-review-grid">
                        <article><h4>Veiculo</h4><ul><li><strong>Marca:</strong> {form.brand || "-"}</li><li><strong>Modelo:</strong> {form.model || "-"}</li><li><strong>Ano:</strong> {form.year || "-"}</li><li><strong>KM:</strong> {form.km || "-"}</li><li><strong>Combustivel:</strong> {form.fuel || "-"}</li><li><strong>Cambio:</strong> {form.transmission || "-"}</li><li><strong>Cor:</strong> {form.color || "-"}</li></ul></article>
                        <article><h4>Contato</h4><ul><li><strong>Nome:</strong> {form.fullName || "-"}</li><li><strong>E-mail:</strong> {form.email || "-"}</li><li><strong>Telefone:</strong> {form.phone || "-"}</li><li><strong>Cidade/UF:</strong> {form.city ? `${form.city}/${form.state}` : "-"}</li><li><strong>Canal:</strong> {form.contactChannel || "-"}</li><li><strong>Fotos:</strong> {form.photos.length}</li><li><strong>Valor:</strong> {form.desiredPrice ? `R$ ${form.desiredPrice}` : "-"}</li></ul></article>
                      </div>
                      <label className="sell-check"><input type="checkbox" checked={form.acceptedTerms} onChange={(event) => handleChange("acceptedTerms", event.target.checked)} /><span>Li e concordo com os termos de atendimento.</span></label>
                      <FieldError error={errors.acceptedTerms} />
                      <label className="sell-check"><input type="checkbox" checked={form.acceptedLgpd} onChange={(event) => handleChange("acceptedLgpd", event.target.checked)} /><span>Autorizo o uso dos dados para contato conforme LGPD.</span></label>
                      <FieldError error={errors.acceptedLgpd} />
                    </div>
                  )}
                </div>

                <aside className="sell-security-card">
                  <Image src="/images/hero-car.png" alt="Processo seguro Savol" width={777} height={474} className="sell-security-image" />
                  <h4>Processo 100% seguro</h4>
                  <ul>
                    <li><CheckCircle2 size={16} /> Avaliacao rapida e gratuita</li>
                    <li><CheckCircle2 size={16} /> Seus dados protegidos</li>
                    <li><CheckCircle2 size={16} /> Sem compromisso</li>
                    <li><CheckCircle2 size={16} /> Atendimento especializado</li>
                  </ul>
                </aside>
              </div>

              <footer className="sell-form-footer">
                <button type="button" className="btn btn-outline" onClick={resetWizard}>Cancelar</button>
                <div className="sell-form-footer-right">
                  {step > 1 && <button type="button" className="btn btn-outline" onClick={goBack}><ChevronLeft size={16} /> Voltar</button>}
                  {step < 5 ? <button type="button" className="btn" onClick={goNext}>Continuar <ChevronRight size={16} /></button> : <button type="button" className="btn" onClick={submit} disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Enviar avaliacao"} <ArrowRight size={16} /></button>}
                </div>
              </footer>
            </form>
          )}

          <section className="sell-proof">
            <article className="sell-proof-main"><div className="sell-proof-icon"><CheckCircle2 size={24} /></div><div><h3>Por que vender com a Savol?</h3><p>Somos referencia em seminovos e oferecemos negociacao transparente com suporte completo.</p></div></article>
            <article><strong>+15</strong><span>anos de experiencia</span></article>
            <article><strong>+10 mil</strong><span>negociacoes realizadas</span></article>
            <article><strong>100%</strong><span>avaliacao justa e transparente</span></article>
          </section>

          <section className="sell-advantage-grid">
            <article><span><Calendar size={17} /></span><div><strong>Avaliacao rapida</strong><p>Resposta em pouco tempo.</p></div></article>
            <article><span><ShieldCheck size={17} /></span><div><strong>100% seguro</strong><p>Dados protegidos e processo claro.</p></div></article>
            <article><span><CircleDollarSign size={17} /></span><div><strong>Melhor oferta</strong><p>Avaliacao justa para seu carro.</p></div></article>
            <article><span><Store size={17} /></span><div><strong>Rede Savol</strong><p>Mais de 15 lojas para vender rapido.</p></div></article>
          </section>

          <section className="sell-summary-bar">
            <p><strong>{STEPS.filter((item) => isStepDone(item.id)).length}</strong> de {STEPS.length} etapas concluidas</p>
            <div className="sell-summary-icons"><Calendar size={15} /><Gauge size={15} /><Fuel size={15} /><Palette size={15} /><Settings2 size={15} /><Camera size={15} /><UserRound size={15} /><Mail size={15} /><Phone size={15} /><MapPin size={15} /></div>
          </section>
        </section>
      </div>
    </section>
  );
}
