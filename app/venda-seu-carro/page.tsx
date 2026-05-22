import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SellYourCarWizard } from "@/components/SellYourCarWizard";
import { SiteHeader } from "@/components/SiteHeader";

export default function VendaSeuCarroPage() {
  return (
    <main>
      <SiteHeader active="venda" />
      <HomeSessionDataProvider>
        <SellYourCarWizard />
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
