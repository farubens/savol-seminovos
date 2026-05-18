import Image from "next/image";
import {
  CarFront,
  CircleDollarSign,
  Heart,
  MapPinned,
  Phone,
  Search,
  ShieldCheck,
  Store,
  UserRoundCheck,
  Wrench
} from "lucide-react";
import { CategoryFinder } from "@/components/CategoryFinder";
import { StoresCarousel } from "@/components/StoresCarousel";
import { VehicleGrid } from "@/components/VehicleGrid";

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
          <a className="active" href="#">
            Home
          </a>
          <a href="#">Veículos</a>
          <a href="#">Lojas</a>
          <a href="#">Serviços</a>
          <a href="#">Venda seu carro</a>
          <a href="#">Institucional</a>
          <a className="btn btn-sm" href="#">
            Contato
          </a>
          <a href="#" className="icon-btn" aria-label="Buscar">
            <Search size={16} />
          </a>
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
              <a href="#" className="btn">
                Ver veículos
              </a>
              <a href="#" className="btn btn-outline">
                Nossas lojas
              </a>
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

      <section className="container sell">
        <div className="sell-brand-card">
          <Image src="/images/imagem-cta.png" alt="Marca parceira Savol" width={260} height={260} className="sell-brand-image" />
        </div>
        <div className="sell-copy">
          <h2>Venda seu carro</h2>
          <p>Aqui no Grupo Savol você vende seu carro com segurança, rapidez e o melhor valor.</p>
          <a href="#" className="btn">
            Quero vender
          </a>
        </div>
        <ul className="sell-checks">
          <li>
            <ShieldCheck size={18} /> Avaliação gratuita
          </li>
          <li>
            <CircleDollarSign size={18} /> Pagamento à vista
          </li>
          <li>
            <ShieldCheck size={18} /> Processo seguro
          </li>
          <li>
            <Store size={18} /> Divulgação em + de 15 lojas
          </li>
        </ul>
      </section>

      <section className="container">
        <h2>Por que comprar no Grupo Savol?</h2>
        <div className="mini-benefits">
          <article>
            <CarFront size={22} />
            <h3>Variedade</h3>
            <p>Mais de 1.000 veículos de todas as marcas</p>
          </article>
          <article>
            <ShieldCheck size={22} />
            <h3>Procedência</h3>
            <p>Veículos revisados e com histórico</p>
          </article>
          <article>
            <Store size={22} />
            <h3>Segurança</h3>
            <p>Compra segura com lojas credenciadas</p>
          </article>
          <article>
            <CircleDollarSign size={22} />
            <h3>Facilidade</h3>
            <p>As melhores condições de financiamento</p>
          </article>
          <article>
            <UserRoundCheck size={22} />
            <h3>Atendimento</h3>
            <p>Especialistas prontos para te ajudar</p>
          </article>
        </div>
      </section>

      <section className="container testimonials-wrap">
        <div className="section-title-row">
          <h2>O que dizem nossos clientes</h2>
          <a href="#">Ver mais depoimentos</a>
        </div>
        <div className="testimonials">
          <article className="testimonial">
            <p>"Excelente atendimento e muita transparência na negociação."</p>
            <strong>Carlos Andrade</strong>
          </article>
          <article className="testimonial">
            <p>"Encontrei o carro que queria com ótimo preço e financiamento fácil."</p>
            <strong>Juliana M.</strong>
          </article>
          <article className="testimonial">
            <p>"Lojas confiáveis e carros de qualidade. Voltarei a fazer negócios."</p>
            <strong>Ricardo Santos</strong>
          </article>
        </div>
      </section>

      <section className="newsletter">
        <div className="container newsletter-inner">
          <p>Receba ofertas exclusivas</p>
          <form>
            <input type="email" placeholder="Seu melhor e-mail" />
            <button type="submit">Cadastrar</button>
          </form>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <Image src="/images/logo.png" alt="Savol" width={170} height={41} className="site-logo" />
            <p>© 2026 Grupo Savol. Todos os direitos reservados.</p>
          </div>
          <div className="footer-links">
            <a href="#">Institucional</a>
            <a href="#">Veículos</a>
            <a href="#">Serviços</a>
            <a href="#">Ajuda</a>
            <a href="#">Contato</a>
          </div>
          <p>
            <MapPinned size={16} /> Av. Eng. Caetano Álvares, 5000 - São Paulo
          </p>
        </div>
      </footer>
    </main>
  );
}




