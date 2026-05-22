import Image from "next/image";
import { Award, BookOpen, Building2, Eye, GraduationCap, Handshake, Inbox, Lightbulb, ShieldCheck, Target, Users } from "lucide-react";

const ICON_SIZE = 24;

const historyStats = [
  {
    icon: Users,
    value: "+60",
    title: "anos de historia",
    description: "Tradicao que se renova a cada dia."
  },
  {
    icon: Building2,
    value: "+20",
    title: "unidades",
    description: "Presenca estrategica no Grande ABC, SP e Baixada."
  },
  {
    icon: ShieldCheck,
    value: "6",
    title: "marcas representadas",
    description: "Volkswagen, Toyota, Kia, Fiat, Peugeot e Citroen."
  },
  {
    icon: Award,
    value: "Milhares",
    title: "de clientes",
    description: "Relacoes construidas com confianca e transparencia."
  }
];

const values = [
  {
    icon: ShieldCheck,
    title: "Integridade",
    description: "Agimos com etica, transparencia e honestidade em todas as nossas relacoes."
  },
  {
    icon: GraduationCap,
    title: "Aprendizado continuo",
    description: "Estamos em evolucao constante, aprendendo para gerar resultados melhores."
  },
  {
    icon: Lightbulb,
    title: "Inovacao",
    description: "Buscamos novas ideias, tecnologias e processos para evoluir continuamente."
  },
  {
    icon: Users,
    title: "Inclusao",
    description: "Valorizamos diversidade, respeito mutuo e trabalho colaborativo."
  },
  {
    icon: BookOpen,
    title: "Desenvolver pessoas",
    description: "Investimos no crescimento da equipe para transformar potencial em impacto."
  },
  {
    icon: Handshake,
    title: "Relacionamento",
    description: "Nosso negocio e construido em relacoes duradouras, proximas e confiaveis."
  }
];

const brandLogos = [
  { name: "Volkswagen", logo: "/images/brands/volkswagen.png" },
  { name: "Toyota", logo: "/images/brands/toyota.png" },
  { name: "Kia", logo: "/images/brands/kia.png" },
  { name: "Fiat", logo: "/images/brands/fiat.svg" },
  { name: "Peugeot", logo: "/images/brands/peugeot.svg" },
  { name: "Citroen", logo: "/images/brands/citroen.png" }
];

export function InstitutionalPage() {
  return (
    <section className="container institutional-page">
      <header className="institutional-hero">
        <div className="institutional-hero-copy">
          <p className="institutional-head-breadcrumb">Inicio / Institucional / Sobre o Grupo Savol</p>
          <h1>Sobre o Grupo Savol</h1>
          <span className="institutional-head-line" />
          <p className="institutional-head-lead">Ha mais de 60 anos movendo pessoas, construindo relacoes e gerando valor.</p>
        </div>
        <div className="institutional-hero-photo" aria-hidden="true" />
      </header>

      <section className="institutional-overview">
        <article className="institutional-about">
          <p>Somos um grupo empresarial familiar, solido e com forte presenca no Grande ABC, Sao Paulo e Baixada Santista.</p>
          <p>Fundado em 1963, nosso grupo atua no varejo automotivo com foco em experiencia, credibilidade e relacionamento.</p>
          <p>Com orgulho, representamos grandes marcas e seguimos evoluindo com inovacao e foco total no cliente.</p>
        </article>

        <div className="institutional-stats">
          {historyStats.map(({ icon: Icon, value, title, description }) => (
            <article key={title} className="institutional-stat-card">
              <span className="institutional-icon">
                <Icon size={ICON_SIZE} />
              </span>
              <strong>{value}</strong>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="institutional-purpose">
        <article className="institutional-purpose-item">
          <span className="institutional-icon">
            <Target size={ICON_SIZE} />
          </span>
          <div>
            <h3>Missao</h3>
            <p>Fornecer solucoes automotivas de alta qualidade, com excelencia no atendimento e foco no desenvolvimento sustentavel.</p>
          </div>
        </article>
        <article className="institutional-purpose-item">
          <span className="institutional-icon">
            <Eye size={ICON_SIZE} />
          </span>
          <div>
            <h3>Visao</h3>
            <p>Ser reconhecido como grupo lider em mobilidade e servicos, conectado com a evolucao do mercado e da sociedade.</p>
          </div>
        </article>
      </section>

      <section className="institutional-values">
        <header>
          <h2>Nossos valores</h2>
          <span className="institutional-section-line" />
        </header>
        <div className="institutional-values-grid">
          {values.map(({ icon: Icon, title, description }) => (
            <article key={title} className="institutional-value-item">
              <span className="institutional-icon">
                <Icon size={ICON_SIZE} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="institutional-brands">
        <header>
          <h2>Marcas que representamos</h2>
          <span className="institutional-section-line" />
        </header>
        <div className="institutional-brands-grid">
          {brandLogos.map((brand) => (
            <article key={brand.name}>
              <Image src={brand.logo} alt={brand.name} width={128} height={58} />
            </article>
          ))}
        </div>
      </section>

      <section className="institutional-newsletter">
        <div className="institutional-newsletter-copy">
          <span className="institutional-icon institutional-icon--light">
            <Inbox size={ICON_SIZE} />
          </span>
          <div>
            <h3>Fique por dentro das novidades Savol</h3>
            <p>Receba ofertas exclusivas, lancamentos e oportunidades.</p>
          </div>
        </div>
        <form className="institutional-newsletter-form">
          <input type="email" placeholder="Seu melhor e-mail" />
          <button type="submit">Quero receber</button>
        </form>
      </section>
    </section>
  );
}
