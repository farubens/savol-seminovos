import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function AjudaPage() {
  return (
    <main>
      <SiteHeader />
      <section className="container simple-page">
        <h1>Ajuda</h1>
        <p>Precisa de suporte? Nossa equipe está pronta para ajudar com seu financiamento, documentação e atendimento.</p>
      </section>
      <HomeSessionDataProvider>
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
