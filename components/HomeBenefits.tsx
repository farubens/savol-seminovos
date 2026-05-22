"use client";

import { Customer, Dollar, Protection, Shop, Tool } from "@icon-park/react";

const HOME_BENEFIT_ICON_COLORS: [string, string] = ["#0A2E73", "#F4B400"];

const homeBenefitIconProps = {
  theme: "two-tone" as const,
  size: 26,
  strokeWidth: 2.2,
  fill: HOME_BENEFIT_ICON_COLORS
};

export function HomeBenefits() {
  return (
    <section className="container benefits">
      <article className="benefit">
        <span className="benefit-icon" aria-hidden="true">
          <Tool {...homeBenefitIconProps} />
        </span>
        <div>
          <h3>Veículos revisados</h3>
          <p>Qualidade garantida</p>
        </div>
      </article>
      <article className="benefit">
        <span className="benefit-icon" aria-hidden="true">
          <Protection {...homeBenefitIconProps} />
        </span>
        <div>
          <h3>Garantia</h3>
          <p>Mais segurança para você</p>
        </div>
      </article>
      <article className="benefit">
        <span className="benefit-icon" aria-hidden="true">
          <Shop {...homeBenefitIconProps} />
        </span>
        <div>
          <h3>Melhores lojas</h3>
          <p>Do Grupo Savol</p>
        </div>
      </article>
      <article className="benefit">
        <span className="benefit-icon" aria-hidden="true">
          <Dollar {...homeBenefitIconProps} />
        </span>
        <div>
          <h3>Facilidade</h3>
          <p>Financie sem complicação</p>
        </div>
      </article>
      <article className="benefit">
        <span className="benefit-icon" aria-hidden="true">
          <Customer {...homeBenefitIconProps} />
        </span>
        <div>
          <h3>Atendimento</h3>
          <p>Especializado</p>
        </div>
      </article>
    </section>
  );
}
