import { Suspense } from "react";
import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { VehicleCatalog } from "@/components/VehicleCatalog";

export default function VeiculosPage() {
  return (
    <main>
      <SiteHeader active="veiculos" />
      <HomeSessionDataProvider>
        <Suspense fallback={<section className="container simple-page"><p>Carregando catálogo...</p></section>}>
          <VehicleCatalog />
        </Suspense>
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
