import type { Metadata } from "next";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { PageTransition } from "@/components/PageTransition";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savol Seminovos",
  description: "Encontre o carro ideal para voce"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <PageTransition>{children}</PageTransition>
        <FloatingWhatsAppButton />
      </body>
    </html>
  );
}

