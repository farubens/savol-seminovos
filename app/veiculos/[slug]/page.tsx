import type { Metadata } from "next";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { VehicleDetailsPageClient } from "@/components/VehicleDetailsPageClient";
import type { ApiVehicle } from "@/types/home";

const SITE_BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.savolseminovos.com.br").replace(/\/+$/, "");
const FALLBACK_OG_IMAGE = "/images/em-preparacao.jpg";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type VehicleApiResponse = {
  items?: ApiVehicle[];
};

function absoluteUrl(value: string | undefined): string {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return `${SITE_BASE_URL}${FALLBACK_OG_IMAGE}`;
  if (/^https?:\/\//i.test(cleanValue)) return cleanValue;
  return `${SITE_BASE_URL}${cleanValue.startsWith("/") ? cleanValue : `/${cleanValue}`}`;
}

async function getVehicleBySlug(slug: string): Promise<ApiVehicle | null> {
  try {
    const response = await fetch(`${SITE_BASE_URL}/api/veiculos?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store"
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as VehicleApiResponse;
    return payload.items?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);

  if (!vehicle) {
    return {
      title: "Veículo SAVOL Seminovos",
      description: "Confira os veículos disponíveis na SAVOL Seminovos."
    };
  }

  const title = `${vehicle.name} | SAVOL Seminovos`;
  const description = [vehicle.price, vehicle.year, vehicle.km, vehicle.store].filter(Boolean).join(" - ");
  const pageUrl = absoluteUrl(vehicle.url);
  const imageUrl = absoluteUrl(`/veiculos/${vehicle.slug || slug}/opengraph-image?v=2`);

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "SAVOL Seminovos",
      locale: "pt_BR",
      type: "website",
      images: [
        {
          url: imageUrl,
          alt: vehicle.name
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}

export default async function VeiculoSingularPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <main>
      <SiteHeader active="veiculos" />
      <VehicleDetailsPageClient slug={slug} />
      <SavolMegaFooter />
    </main>
  );
}

