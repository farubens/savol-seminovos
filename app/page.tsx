import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  CarFront,
  CircleDollarSign,
  Heart,
  Mail,
  Phone,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UserRoundCheck,
  Wrench
} from "lucide-react";
import { CategoryFinder } from "@/components/CategoryFinder";
import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SellYourCarCta } from "@/components/SellYourCarCta";
import { StoresCarousel } from "@/components/StoresCarousel";
import { VehicleGrid } from "@/components/VehicleGrid";
import { WhyChooseSavol } from "@/components/WhyChooseSavol";

export default function Home() {
  return (
    <main>
      <div className="topbar">
        <div className="container topbar-inner">
          <p>
            <Phone size={14} /> Atendimento
          </p>
          <p>(11) 2222-3333</p>
          <p>Segunda a sexta: 08h às 19h | Sábado: 08h às 18h</p>
          <p>
            <Heart size={14} /> Meus favoritos
          </p>
        </div>
      </div>

      <header className="header container">
        <Image src="/images/logo.png" alt="Savol" width={200} height={48} className="site-logo" />
        <nav>
          <Link className="active" href="/">
            Home
          </Link>
          <Link href="/veiculos">Veículos</Link>
          <Link href="/lojas">Lojas</Link>
          <Link href="/servicos">Serviços</Link>
          <Link href="/venda-seu-carro">Venda seu carro</Link>
          <Link href="/institucional">Institucional</Link>
          <Link className="btn btn-sm" href="/contato">
            Contato
          </Link>
          <Link href="/veiculos" className="icon-btn" aria-label="Buscar">
            <Search size={16} />
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>
              Encontre o <span>carro ideal</span>
              <br />
              para você.
            </h1>
            <p>São mais de 1.000 veículos de qualidade e as melhores lojas do Grupo Savol.</p>
            <div className="actions">
              <Link href="/veiculos" className="btn">
                Ver veículos
              </Link>
              <Link href="/lojas" className="btn btn-outline">
                Nossas lojas
              </Link>
            </div>
          </div>
          <div className="hero-image-wrap floating">
            <Image src="/images/hero-car.png" alt="Carro destaque" width={720} height={420} className="hero-image" />
          </div>
        </div>
      </section>

      <section className="container benefits">
        <article className="benefit">
          <Wrench size={20} />
          <div>
            <h3>Veículos revisados</h3>
            <p>Qualidade garantida</p>
          </div>
        </article>
        <article className="benefit">
          <ShieldCheck size={20} />
          <div>
            <h3>Garantia</h3>
            <p>Mais segurança para você</p>
          </div>
        </article>
        <article className="benefit">
          <Store size={20} />
          <div>
            <h3>Melhores lojas</h3>
            <p>Do Grupo Savol</p>
          </div>
        </article>
        <article className="benefit">
          <CircleDollarSign size={20} />
          <div>
            <h3>Facilidade</h3>
            <p>Financie sem complicação</p>
          </div>
        </article>
        <article className="benefit">
          <UserRoundCheck size={20} />
          <div>
            <h3>Atendimento</h3>
            <p>Especializado</p>
          </div>
        </article>
      </section>

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

        <section className="testimonials-wrap">
          <div className="container testimonials-shell">
            <p className="testimonials-kicker">
              <span>Savol</span>
              <span>Excelência que gera confiança</span>
            </p>

            <div className="section-title-row testimonials-title-row">
              <h2>O que dizem nossos clientes</h2>
              <button type="button">Ver mais depoimentos</button>
            </div>

            <div className="testimonials-grid">
              <article className="testimonial-card">
                <div className="testimonial-card-top">
                  <div className="testimonial-stars" aria-label="5 estrelas">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={`star-carlos-${index}`} size={18} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                  <span className="testimonial-quote-icon" aria-hidden="true">
                    <Quote size={20} />
                  </span>
                </div>

                <p className="testimonial-message">"Excelente atendimento e muita transparência na negociação."</p>
                <div className="testimonial-divider" />

                <div className="testimonial-footer">
                  <span className="testimonial-avatar">CA</span>
                  <div>
                    <strong>Carlos Andrade</strong>
                    <p>
                      <CarFront size={16} /> Comprou um Toyota Corolla
                    </p>
                  </div>
                </div>
              </article>

              <article className="testimonial-card">
                <div className="testimonial-card-top">
                  <div className="testimonial-stars" aria-label="5 estrelas">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={`star-juliana-${index}`} size={18} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                  <span className="testimonial-quote-icon" aria-hidden="true">
                    <Quote size={20} />
                  </span>
                </div>

                <p className="testimonial-message">"Encontrei o carro que queria com ótimo preço e financiamento fácil."</p>
                <div className="testimonial-divider" />

                <div className="testimonial-footer">
                  <span className="testimonial-avatar">JM</span>
                  <div>
                    <strong>Juliana M.</strong>
                    <p>
                      <CarFront size={16} /> Comprou um Honda HR-V
                    </p>
                  </div>
                </div>
              </article>

              <article className="testimonial-card">
                <div className="testimonial-card-top">
                  <div className="testimonial-stars" aria-label="5 estrelas">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={`star-ricardo-${index}`} size={18} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                  <span className="testimonial-quote-icon" aria-hidden="true">
                    <Quote size={20} />
                  </span>
                </div>

                <p className="testimonial-message">"Lojas confiáveis e carros de qualidade. Voltarei a fazer negócios."</p>
                <div className="testimonial-divider" />

                <div className="testimonial-footer">
                  <span className="testimonial-avatar">RS</span>
                  <div>
                    <strong>Ricardo Santos</strong>
                    <p>
                      <CarFront size={16} /> Comprou uma Toyota Hilux
                    </p>
                  </div>
                </div>
              </article>
            </div>

            <p className="testimonials-brand-line" aria-hidden="true">
              <span />
              Savol
              <span />
            </p>
          </div>
        </section>

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




