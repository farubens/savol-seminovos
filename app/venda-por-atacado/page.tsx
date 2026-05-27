import Image from "next/image";
import { BadgeCheck, Boxes, Handshake, ShieldCheck } from "lucide-react";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function VendaPorAtacadoPage() {
  return (
    <main>
      <SiteHeader active="atacado" />

      <section className="container wholesale-page">
        <article className="wholesale-hero-v2">
          <div className="wholesale-hero-v2-copy">
            <p className="wholesale-hero-v2-kicker">Condições especiais para lojistas e revendedores</p>
            <h1>
              Venda
              <span>por atacado</span>
            </h1>
            <p>
              Soluções inteligentes para compra em volume. Veículos revisados, procedência validada e negociação dedicada
              para o seu negócio ir mais longe.
            </p>
            <div className="wholesale-hero-v2-actions">
              <a href="https://autoavaliar.com.br/cadastre-se/" target="_blank" rel="noopener noreferrer" className="btn wholesale-hero-v2-primary">
                Saiba mais
              </a>
            </div>
          </div>

          <div className="wholesale-hero-v2-media" aria-hidden="true">
            <Image src="/images/hero-car.png" alt="Estoque atacado Savol" width={880} height={520} className="wholesale-hero-v2-image" priority />
          </div>
        </article>

        <section className="wholesale-benefits-v2">
          <h2>Vantagens de comprar com a Savol Seminovos</h2>
          <div className="wholesale-benefits-v2-grid">
            <article>
              <span><Boxes size={22} /></span>
              <div>
                <h3>Estoque selecionado</h3>
                <p>Variedade de modelos com alta liquidez e giro rápido.</p>
              </div>
            </article>
            <article>
              <span><Handshake size={22} /></span>
              <div>
                <h3>Negociação dedicada</h3>
                <p>Condições exclusivas para compras em volume.</p>
              </div>
            </article>
            <article>
              <span><ShieldCheck size={22} /></span>
              <div>
                <h3>Veículos revisados</h3>
                <p>Inspeção completa e rigoroso padrão de qualidade.</p>
              </div>
            </article>
            <article>
              <span><BadgeCheck size={22} /></span>
              <div>
                <h3>Procedência validada</h3>
                <p>Histórico transparente e documentação em dia.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="wholesale-steps-v2">
          <h2>Como funciona</h2>
          <div className="wholesale-steps-v2-grid">
            <article>
              <strong>01</strong>
              <div>
                <h3>Cadastro</h3>
                <p>Preencha seus dados e informações da empresa para iniciar.</p>
              </div>
            </article>
            <article>
              <strong>02</strong>
              <div>
                <h3>Aprovação</h3>
                <p>Nossa equipe analisa e entra em contato para validação.</p>
              </div>
            </article>
            <article>
              <strong>03</strong>
              <div>
                <h3>Acesso ao estoque</h3>
                <p>Acesse as oportunidades exclusivas e compre com segurança.</p>
              </div>
            </article>
          </div>
        </section>
      </section>

      <SavolMegaFooter />
    </main>
  );
}

