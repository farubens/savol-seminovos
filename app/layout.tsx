import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}

