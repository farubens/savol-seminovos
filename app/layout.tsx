import type { Metadata } from "next";
import { Suspense } from "react";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { PageTransition } from "@/components/PageTransition";
import { SavolAccountProvider } from "@/components/SavolAccountProvider";
import { SavolAnalyticsTracker } from "@/components/SavolAnalyticsTracker";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const ENABLE_FLOATING_WHATSAPP = false;

export const metadata: Metadata = {
  title: "SAVOL Seminovos",
  description: "Encontre o carro ideal para você",
  icons: {
    icon: "/favicon.webp",
    shortcut: "/favicon.webp"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <SavolAccountProvider>
          <PageTransition>{children}</PageTransition>
          <Suspense fallback={null}>
            <SavolAnalyticsTracker />
          </Suspense>
          {ENABLE_FLOATING_WHATSAPP ? <FloatingWhatsAppButton /> : null}
        </SavolAccountProvider>
      </body>
    </html>
  );
}

