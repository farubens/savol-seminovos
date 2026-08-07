import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { PageTransition } from "@/components/PageTransition";
import { SavolAccountProvider } from "@/components/SavolAccountProvider";
import { SavolAnalyticsTracker } from "@/components/SavolAnalyticsTracker";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const ENABLE_FLOATING_WHATSAPP = false;
const GOOGLE_TAG_MANAGER_ID = "GTM-5VRBL3ML";

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
      <head>
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');`}
        </Script>
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GOOGLE_TAG_MANAGER_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
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

