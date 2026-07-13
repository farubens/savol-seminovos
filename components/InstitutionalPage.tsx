import Image from "next/image";
import { Award, BookOpen, Building2, Eye, GraduationCap, Handshake, Inbox, Lightbulb, ShieldCheck, Target, Users } from "lucide-react";

const ICON_SIZE = 24;

const historyStats = [
  {
    icon: Users,
    value: "63",
    title: "anos de história",
    description: "Tradição que se renova a cada dia."
  },
  {
    icon: Building2,
    value: "+20",
    title: "unidades",
    description: "Presença estratégica no Grande ABC, SP e Baixada."
  },
  {
    icon: ShieldCheck,
    value: "8",
    title: "marcas representadas",
    description: "Volkswagen, Toyota, Kia, Fiat, Peugeot, Citroën, MG e Jetour."
  },
  {
    icon: Award,
    value: "Milhares",
    title: "de clientes",
    description: "Relações construídas com confiança e transparência."
  }
];

const values = [
  {
    icon: ShieldCheck,
    title: "Integridade",
    description: "Agimos com ética, transparência e honestidade em todas as nossas relações."
  },
  {
    icon: GraduationCap,
    title: "Aprendizado contínuo",
    description: "Estamos em evolução constante, aprendendo para gerar resultados melhores."
  },
  {
    icon: Lightbulb,
    title: "Inovação",
    description: "Buscamos novas ideias, tecnologias e processos para evoluir continuamente."
  },
  {
    icon: Users,
    title: "Inclusão",
    description: "Valorizamos diversidade, respeito mútuo e trabalho colaborativo."
  },
  {
    icon: BookOpen,
    title: "Desenvolver pessoas",
    description: "Investimos no crescimento da equipe para transformar potencial em impacto."
  },
  {
    icon: Handshake,
    title: "Relacionamento",
    description: "Nosso negócio é construído em relações duradouras, próximas e confiáveis."
  }
];

const brandLogos = [
  { name: "Volkswagen", logo: "/images/brands/volkswagen.png" },
  { name: "Toyota", logo: "/images/brands/toyota.png" },
  { name: "Kia", logo: "/images/brands/kia.png" },
  { name: "Fiat", logo: "/images/brands/fiat.svg" },
  { name: "Peugeot", logo: "/images/brands/peugeot.svg" },
  { name: "Citroen", logo: "/images/brands/citroen.png" },
  { name: "MG", logo: "/images/brands/mg.png" },
  { name: "Jetour", logo: "/images/brands/jetour.webp" }
];

export function InstitutionalPage() {
  return (
    <section className="container institutional-page">
      <header className="institutional-hero">
        <div className="institutional-hero-copy">
          <p className="institutional-head-breadcrumb">Início / Institucional / Sobre o Grupo SAVOL</p>
          <h1>Sobre o Grupo SAVOL</h1>
          <span className="institutional-head-line" />
          <p className="institutional-head-lead">Há 63 anos movendo pessoas, construindo relações e gerando valor.</p>
        </div>
        <div className="institutional-hero-photo" aria-hidden="true" />
      </header>

      <section className="institutional-overview">
        <article className="institutional-about">
          <p>Somos um grupo empresarial familiar, sólido e com forte presença no Grande ABC, São Paulo e Baixada Santista.</p>
          <p>São 63 anos de história no varejo automotivo, com foco em experiência, credibilidade e relacionamento.</p>
          <p>Com orgulho, representamos grandes marcas e seguimos evoluindo com inovação e foco total no cliente.</p>
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
            <h3>Missão</h3>
            <p>Fornecer soluções automotivas de alta qualidade, com excelência no atendimento e foco no desenvolvimento sustentável.</p>
          </div>
        </article>
        <article className="institutional-purpose-item">
          <span className="institutional-icon">
            <Eye size={ICON_SIZE} />
          </span>
          <div>
            <h3>Visão</h3>
            <p>Ser reconhecido como grupo líder em mobilidade e serviços, conectado com a evolução do mercado e da sociedade.</p>
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
            <h3>Fique por dentro das novidades SAVOL</h3>
            <p>Receba ofertas exclusivas, lançamentos e oportunidades.</p>
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
