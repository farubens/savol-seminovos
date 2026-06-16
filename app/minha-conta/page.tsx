import { SavolAccountPageClient } from "@/components/SavolAccountPageClient";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function MinhaContaPage() {
  return (
    <main>
      <SiteHeader active="conta" />
      <SavolAccountPageClient />
      <SavolMegaFooter />
    </main>
  );
}
