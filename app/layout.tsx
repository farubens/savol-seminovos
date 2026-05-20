import type { Metadata } from "next";
import { PageTransition } from "@/components/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savol Seminovos",
  description: "Encontre o carro ideal para você"
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
      </body>
    </html>
  );
}

