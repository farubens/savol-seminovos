import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function VendaSeuCarroPage() {
  return (
    <main>
      <SiteHeader active="venda" />
      <section className="container simple-page">
        <h1>Venda seu carro</h1>
        <p>Envie os dados do seu veículo e receba uma avaliação rápida com segurança e transparência.</p>
      </section>
      <HomeSessionDataProvider>
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
