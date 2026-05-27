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
          <form className="contact-form">
            <label>
              <span>Nome</span>
              <input type="text" name="name" placeholder="Seu nome completo" />
            </label>

            <label>
              <span>E-mail</span>
              <input type="email" name="email" placeholder="seuemail@exemplo.com" />
            </label>

            <label>
              <span>Telefone</span>
              <input type="tel" name="phone" placeholder="(11) 99999-9999" />
            </label>

            <label>
              <span>Assunto</span>
              <input type="text" name="subject" placeholder="Ex.: Dúvida sobre financiamento" />
            </label>

            <label className="contact-form-message">
              <span>Mensagem</span>
              <textarea name="message" rows={6} placeholder="Escreva sua mensagem..." />
            </label>

            <button type="submit">Enviar mensagem</button>
          </form>
        </section>
      </section>

      <HomeSessionDataProvider>
        <StoresCarousel />
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
