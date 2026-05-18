"use client";

import Image from "next/image";
import { CalendarDays, Fuel, Gauge, MapPin, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  name: string;
  subtitle: string;
  image: string;
  year: string;
  transmission: string;
  fuel: string;
  km: string;
  store: string;
  oldPrice?: string;
  price: string;
  detailUrl?: string;
  qualityTag?: string;
  delay?: number;
  variant?: "grid" | "list";
};

function normalizeTag(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function resolveTagTone(value: string): "laudo" | "garantia" | "disponivel" {
  const normalized = normalizeTag(value);
  if (normalized.includes("laudo")) return "laudo";
  if (normalized.includes("garantia")) return "garantia";
  return "disponivel";
}

function parseMoney(value: string): number | null {
  if (!value) return null;
  let cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;

  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/\./g, "");
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
}

function resolveOldPrice(oldPrice: string | undefined, price: string): string {
  if (oldPrice && oldPrice.trim()) return oldPrice;
  const currentValue = parseMoney(price);
  if (currentValue == null) return "";
  return `De ${formatMoney(currentValue + 10000)}`;
}

export function VehicleOfferCard({
  name,
  subtitle,
  image,
  year,
  transmission,
  fuel,
  km,
  store,
  oldPrice = "",
  price,
  detailUrl = "#",
  qualityTag = "Disponível",
  delay = 0,
  variant = "grid"
}: Props) {
  const normalizedTag = normalizeTag(qualityTag);
  const showTag = Boolean(qualityTag.trim()) && !normalizedTag.includes("seminovo");
  const tagTone = resolveTagTone(qualityTag);
  const resolvedOldPrice = resolveOldPrice(oldPrice, price);

  return (
    <motion.article
      className={`offer-card offer-card--${variant}`}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      <div className="offer-media">
        {showTag && <span className={`offer-tag offer-tag--${tagTone}`}>{qualityTag}</span>}
        <Image src={image} alt={name} width={630} height={360} />
      </div>

      <div className="offer-content">
        <div className="offer-body">
          <h3>{name}</h3>
          <p className="offer-subtitle">{subtitle}</p>

          <div className="offer-specs">
            <span>
              <CalendarDays size={16} /> {year}
            </span>
            <span>{transmission}</span>
            <span>
              <Fuel size={16} /> {fuel}
            </span>
            <span>
              <Gauge size={16} /> {km}
            </span>
          </div>

          <div className="offer-highlights">
            <span>
              <UserRound size={18} /> Único dono
            </span>
            <span>
              <ShieldCheck size={18} /> Garantia de fábrica
            </span>
          </div>
        </div>

        <div className="offer-footer">
          {Boolean(resolvedOldPrice) && <p className="offer-old-price">{resolvedOldPrice}</p>}
          <p className="offer-price">
            Por <strong>{price}</strong>
          </p>

          <div className="offer-store-wrap">
            <p className="offer-store">
              <MapPin size={16} />
              <span className="offer-store-name">Loja: {store}</span>
            </p>
            <a className="offer-store-link" href={detailUrl}>
              Como chegar
            </a>
          </div>

          <div className="offer-actions">
            <a className="offer-primary" href={detailUrl}>
              <WalletCards size={20} /> Ver parcelas
            </a>
            <a className="offer-secondary" href={detailUrl}>
              Saiba mais
            </a>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

