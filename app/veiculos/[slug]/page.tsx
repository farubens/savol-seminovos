import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { VehicleDetailsPageClient } from "@/components/VehicleDetailsPageClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function VeiculoSingularPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <main>
      <SiteHeader active="veiculos" />
      <VehicleDetailsPageClient slug={slug} />
      <SavolMegaFooter />
    </main>
  );
}

