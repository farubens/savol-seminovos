import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  Heart,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { CategoryFinder } from "@/components/CategoryFinder";
import { HomeBenefits } from "@/components/HomeBenefits";
import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SellYourCarCta } from "@/components/SellYourCarCta";
import { StoresCarousel } from "@/components/StoresCarousel";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { VehicleGrid } from "@/components/VehicleGrid";
import { WhyChooseSavol } from "@/components/WhyChooseSavol";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <main>
      <SiteHeader active="home" />


      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="hero-badge">
              <Star size={14} fill="currentColor" strokeWidth={0} />
              Grupo Savol
            </p>
            <h1>
              Encontre o <span>carro ideal</span>
              <br />
              para você.
            </h1>
            <p>São mais de 1.000 veículos de qualidade e as melhores lojas do Grupo Savol.</p>
            <div className="actions">
              <Link href="/veiculos" className="btn hero-btn hero-btn-primary">
                Ver veículos
              </Link>
              <Link href="/lojas" className="btn btn-outline hero-btn hero-btn-secondary">
                Nossas lojas
              </Link>
            </div>
          </div>
          <div className="hero-image-wrap floating">
            <Image src="/images/hero-car.png" alt="Carro destaque" width={720} height={420} className="hero-image" />
          </div>
        </div>
      </section>

      <HomeBenefits />

      <HomeSessionDataProvider>
        <CategoryFinder />

        <section className="container section-head">
          <div>
            <h2>Veículos em destaque</h2>
          </div>
        </section>

        <section className="container">
          <VehicleGrid />
        </section>

        <StoresCarousel />

        <SellYourCarCta />

        <WhyChooseSavol />

        <TestimonialsSection />

        <section className="container newsletter">
          <article className="newsletter-card">
            <div className="newsletter-media-wrap">
              <Image src="/images/news-savol.png" alt="Campanha de newsletter Savol" width={640} height={420} className="newsletter-media" />
            </div>

            <div className="newsletter-content">
              <p className="newsletter-kicker">
                <Mail size={18} /> Só para quem gosta de boas escolhas
              </p>
              <h2>Receba ofertas exclusivas</h2>
              <p className="newsletter-description">Cadastre seu e-mail e receba as melhores oportunidades, novidades e condições especiais.</p>

              <form className="newsletter-form">
                <label className="newsletter-input-wrap" htmlFor="newsletter-email">
                  <Mail size={20} />
                  <input id="newsletter-email" type="email" placeholder="Seu melhor e-mail" />
                </label>
                <button type="submit">
                  Cadastrar <ArrowRight size={20} />
                </button>
              </form>

              <ul className="newsletter-highlights">
                <li>
                  <BadgePercent size={18} /> Ofertas exclusivas
                </li>
                <li>
                  <Sparkles size={18} /> Novidades em primeira mão
                </li>
                <li>
                  <ShieldCheck size={18} /> Condições especiais
                </li>
              </ul>
            </div>
          </article>
        </section>

        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}







