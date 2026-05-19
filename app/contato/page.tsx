import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function ContatoPage() {
  return (
    <main>
      <SiteHeader active="contato" />
      <section className="container simple-page">
        <h1>Contato</h1>
        <p>Fale com a equipe Savol para comprar, vender ou tirar dúvidas sobre nosso estoque.</p>
      </section>
      <HomeSessionDataProvider>
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
