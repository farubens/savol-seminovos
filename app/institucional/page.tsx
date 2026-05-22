import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { InstitutionalPage } from "@/components/InstitutionalPage";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function InstitucionalPage() {
  return (
    <main>
      <SiteHeader active="institucional" />
      <InstitutionalPage />
      <HomeSessionDataProvider>
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
