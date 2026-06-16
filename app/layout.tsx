import type { Metadata } from "next";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { PageTransition } from "@/components/PageTransition";
import { SavolAccountProvider } from "@/components/SavolAccountProvider";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savol Seminovos",
  description: "Encontre o carro ideal para você",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg"
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
          <FloatingWhatsAppButton />
        </SavolAccountProvider>
      </body>
    </html>
  );
}

