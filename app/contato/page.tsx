import { ContactForm } from "@/components/ContactForm";
import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StoresCarousel } from "@/components/StoresCarousel";

export default function ContatoPage() {
  return (
    <main>
      <SiteHeader active="contato" />

      <section className="container contact-page">
        <section className="contact-hero">
          <div className="contact-hero-content">
            <p className="contact-hero-kicker">Atendimento Savol</p>
            <h1>Fale com nossa equipe</h1>
            <p>Envie sua mensagem e retornamos o mais rápido possível para ajudar na compra, troca ou venda do seu veículo.</p>
          </div>
        </section>

        <section className="contact-form-section">
          <h2>Envie sua mensagem</h2>
          <ContactForm />
        </section>
      </section>

      <HomeSessionDataProvider>
        <StoresCarousel />
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
