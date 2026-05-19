"use client";

import Image from "next/image";
import { CarFront, CircleDollarSign, ShieldCheck, Store, UserRoundCheck } from "lucide-react";

const items = [
  {
    id: "variedade",
    title: "Variedade",
    description: "Mais de 1.000 veículos de todas as marcas para você escolher.",
    icon: CarFront
  },
  {
    id: "procedencia",
    title: "Procedência",
    description: "Veículos revisados e com histórico transparente para sua tranquilidade.",
    icon: ShieldCheck
  },
  {
    id: "seguranca",
    title: "Segurança",
    description: "Compra segura com laudos credenciados e garantia para você ir tranquilo.",
    icon: Store
  },
  {
    id: "facilidade",
    title: "Facilidade",
    description: "As melhores condições de financiamento para caber no seu plano.",
    icon: CircleDollarSign
  },
  {
    id: "atendimento",
    title: "Atendimento",
    description: "Especialistas prontos para entender suas necessidades e ajudar você a fazer o melhor negócio.",
    icon: UserRoundCheck,
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
            <ShieldCheck size={18} />
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
                    <Icon size={32} />
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
