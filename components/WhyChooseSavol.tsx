"use client";

import Image from "next/image";
import { Car, Customer, Dollar, Protection, Shop } from "@icon-park/react";

const WHY_SAVOL_ICON_COLORS: [string, string] = ["#0A2E73", "#F4B400"];

const whySavolIconProps = {
  theme: "two-tone" as const,
  fill: WHY_SAVOL_ICON_COLORS,
  strokeWidth: 2.2
};

const items = [
  {
    id: "variedade",
    title: "Variedade",
    description: "Centenas de veículos de todas as marcas para você escolher.",
    icon: Car
  },
  {
    id: "procedencia",
    title: "Procedência",
    description: "Veículos revisados e com histórico transparente para sua tranquilidade.",
    icon: Protection
  },
  {
    id: "seguranca",
    title: "Segurança",
    description: "Compra segura com laudos credenciados e garantia para você ir tranquilo.",
    icon: Shop
  },
  {
    id: "facilidade",
    title: "Facilidade",
    description: "Condições de financiamento pensadas para caber no seu plano.",
    icon: Dollar
  },
  {
    id: "atendimento",
    title: "Atendimento",
    description: "Especialistas prontos para entender suas necessidades e apoiar sua escolha.",
    icon: Customer,
    wide: true
  }
];

export function WhyChooseSavol() {
  return (
    <section className="container why-savol">
      <div className="why-savol-layout">
        <article className="why-savol-media-wrap">
          <Image src="/images/side-por-que-savol.png" alt="Equipe Savol em showroom" width={820} height={960} className="why-savol-media" />
          <div className="why-savol-media-badge">
            <Protection {...whySavolIconProps} size={18} />
            <p>Tradição e confiança que movem gerações.</p>
          </div>
        </article>

        <div className="why-savol-content">
          <h2>Por que comprar no <span>Grupo Savol?</span></h2>

          <div className="why-savol-grid">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.id} className={`why-savol-card${item.wide ? " why-savol-card--wide" : ""}`}>
                  <div className="why-savol-icon">
                    <Icon {...whySavolIconProps} size={34} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  <span className="why-savol-line" aria-hidden="true" />
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
