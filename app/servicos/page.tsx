import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function ServicosPage() {
  return (
    <main>
      <SiteHeader active="servicos" />
      <section className="container simple-page">
        <h1>Serviços</h1>
        <p>Conheça nossos serviços de financiamento, avaliação, troca com troco e pós-vendas.</p>
      </section>
      <HomeSessionDataProvider>
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
