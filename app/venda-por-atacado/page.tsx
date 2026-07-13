import Image from "next/image";
import { CarFront, Monitor, ShieldCheck, Store } from "lucide-react";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function VendaPorAtacadoPage() {
  return (
    <main>
      <SiteHeader active="atacado" />

      <section className="container wholesale-page">
        <article className="wholesale-hero-v2">
          <div className="wholesale-hero-v2-copy">
            <p className="wholesale-hero-v2-kicker">Oportunidades voltadas para lojistas e revendedores</p>
            <h1>
              Venda
              <span>por atacado</span>
            </h1>
            <p>
              Consulte os veículos disponíveis e realize todo o processo de negociação diretamente pela plataforma AUTOAVALIAR.
            </p>
            <div className="wholesale-hero-v2-actions">
              <a href="https://b2b.autoavaliar.com.br/avaliacoes/sorria" target="_blank" rel="noopener noreferrer" className="btn wholesale-hero-v2-primary">
                Saiba mais
              </a>
            </div>
          </div>

          <div className="wholesale-hero-v2-media" aria-hidden="true">
            <Image src="/images/CELTA.webp" alt="Estoque atacado SAVOL" width={880} height={520} className="wholesale-hero-v2-image" priority />
          </div>
        </article>

        <section className="wholesale-benefits-v2">
          <h2>Informações importantes para compra de repasse</h2>
          <div className="wholesale-benefits-v2-grid">
            <article>
              <span><Store size={22} /></span>
              <div>
                <h3>Venda para lojistas</h3>
                <p>Oferta exclusiva para empresas com CNPJ ativo.</p>
              </div>
            </article>
            <article>
              <span><ShieldCheck size={22} /></span>
              <div>
                <h3>Modelo de repasse</h3>
                <p>Veículos destinados à revenda, com informações e condições disponíveis na plataforma.</p>
              </div>
            </article>
            <article>
              <span><CarFront size={22} /></span>
              <div>
                <h3>Venda no estado</h3>
                <p>Unidades comercializadas conforme se encontram.</p>
              </div>
            </article>
            <article>
              <span><Monitor size={22} /></span>
              <div>
                <h3>Processo via AUTOAVALIAR</h3>
                <p>Consulta, negociação e compra realizadas na plataforma.</p>
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
                <p>Faça seu cadastro como lojista utilizando o CNPJ da empresa.</p>
              </div>
            </article>
            <article>
              <strong>02</strong>
              <div>
                <h3>Acesso à plataforma</h3>
                <p>Entre na AUTOAVALIAR para visualizar os veículos disponíveis.</p>
              </div>
            </article>
            <article>
              <strong>03</strong>
              <div>
                <h3>Negociação e compra</h3>
                <p>Todo o processo de negociação e fechamento ocorre dentro da plataforma.</p>
              </div>
            </article>
          </div>
        </section>
      </section>

      <SavolMegaFooter />
    </main>
  );
}

