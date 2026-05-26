import Image from "next/image";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function VendaPorAtacadoPage() {
  return (
    <main>
      <SiteHeader active="atacado" />

      <section className="container wholesale-page">
        <article className="wholesale-hero">
          <div className="wholesale-hero-copy">
            <div className="wholesale-hero-title">
              <h1>Venda</h1>
              <span>por atacado</span>
              <div className="wholesale-hero-line" />
            </div>
          </div>

          <div className="wholesale-hero-cars" aria-hidden="true">
            <Image src="/images/hero-car.png" alt="Estoque Savol para atacado" width={720} height={420} className="wholesale-hero-image" priority />
          </div>
        </article>

        <article className="wholesale-content">
          <h2>Venda por atacado</h2>
          <p>
            A Savol Seminovos oferece condições especiais para compra em volume, com estoque selecionado e negociação dedicada para lojistas
            e revendedores.
          </p>
          <p>
            Nosso portfólio é renovado constantemente, com veículos revisados e procedência validada, garantindo agilidade na reposição
            do seu estoque e segurança na operação.
          </p>
          <p>Cadastre-se no link abaixo e siga as instruções para ter acesso ao nosso estoque e às oportunidades de atacado.</p>

          <a href="https://autoavaliar.com.br/cadastre-se/" target="_blank" rel="noopener noreferrer" className="btn wholesale-cta">
            Saiba mais
          </a>
        </article>
      </section>

      <SavolMegaFooter />
    </main>
  );
}
