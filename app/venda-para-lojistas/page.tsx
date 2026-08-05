import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { VehicleCatalog } from "@/components/VehicleCatalog";

export const metadata: Metadata = {
  title: "Venda para Lojistas | SAVOL Seminovos",
  description: "Confira os veículos de repasse disponíveis para lojistas na SAVOL Seminovos."
};

export default function VendaParaLojistasPage() {
  return (
    <main>
      <SiteHeader active="lojistas" />
      <HomeSessionDataProvider vehiclesPerPage={200}>
        <Suspense fallback={<section className="container simple-page"><p>Carregando veículos de repasse...</p></section>}>
          <VehicleCatalog mode="repasse" basePath="/venda-para-lojistas" />
        </Suspense>
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
