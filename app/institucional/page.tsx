import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function InstitucionalPage() {
  return (
    <main>
      <SiteHeader active="institucional" />
      <section className="container simple-page">
        <h1>Institucional</h1>
        <p>Tradição, confiança e atendimento especializado para você comprar seu próximo seminovo com tranquilidade.</p>
      </section>
      <HomeSessionDataProvider>
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
