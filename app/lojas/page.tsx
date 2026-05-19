import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StoreDirectory } from "@/components/StoreDirectory";

export default function LojasPage() {
  return (
    <main>
      <SiteHeader active="lojas" />
      <HomeSessionDataProvider>
        <StoreDirectory />
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
