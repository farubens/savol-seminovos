import { ImageResponse } from "next/og";
import type { ApiVehicle } from "@/types/home";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "Oferta SAVOL Seminovos";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";
export const revalidate = 0;

const SITE_BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.savolseminovos.com.br").replace(/\/+$/, "");
const FALLBACK_IMAGE = "/images/em-preparacao.jpg";
const LOGO_IMAGE = "/images/logo.png";

type ImageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

type VehicleApiResponse = {
  items?: ApiVehicle[];
};

function absoluteUrl(value: string | undefined): string {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return `${SITE_BASE_URL}${FALLBACK_IMAGE}`;
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

function splitVehicleName(vehicle: ApiVehicle): { brand: string; headline: string; details: string } {
  const brand = vehicle.brand || "";
  const headline = vehicle.model || vehicle.name.replace(new RegExp(`^${brand}\\s+`, "i"), "").trim() || vehicle.name;
  const details = vehicle.version || vehicle.subtitle || vehicle.name.replace(`${brand} ${headline}`, "").trim();
  return {
    brand: brand.toUpperCase(),
    headline: headline.toUpperCase(),
    details: details.toUpperCase()
  };
}

function yearLabel(year: string): string {
  const parts = String(year || "").match(/\d{4}/g);
  return parts?.at(-1) ?? "";
}

function mainBadge(vehicle: ApiVehicle): string {
  if (vehicle.secondaryHighlights?.some((item) => /baixa\s*km|baixa\s*quilometragem/i.test(item))) {
    return "BAIXA QUILOMETRAGEM";
  }
  if (vehicle.negotiating) return "EM NEGOCIACAO";
  if (vehicle.armored) return "BLINDADO";
  return "TOP OFERTA";
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\.*$/, "")}...`;
  }

  return lines;
}

export default async function VehicleOpenGraphImage({ params }: ImageProps) {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);

  if (!vehicle) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f4f6fb",
            color: "#002b66",
            fontSize: 64,
            fontWeight: 900
          }}
        >
          SAVOL SEMINOVOS
        </div>
      ),
      size
    );
  }

  const { brand, headline, details } = splitVehicleName(vehicle);
  const imageUrl = absoluteUrl(vehicle.image);
  const logoUrl = absoluteUrl(LOGO_IMAGE);
  const badge = mainBadge(vehicle);
  const modelYear = yearLabel(vehicle.year);
  const headlineLines = wrapText(headline, 22, 2);
  const detailLines = wrapText(details, 38, 2);
  const specs = [
    vehicle.km,
    vehicle.transmission,
    vehicle.fuel,
    vehicle.store?.replace(/^loja:\s*/i, "")
  ].filter(Boolean);

  return new ImageResponse(
    (
      <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#f6f7f9",
            color: "#0a1630",
          fontFamily: "Arial"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(135deg, #ffffff 0%, #f8f8f8 48%, #e9edf3 100%)"
          }}
        />
        <img
          src={logoUrl}
          alt=""
          style={{
            position: "absolute",
            left: 34,
            top: 24,
            width: 310,
            height: "auto",
            objectFit: "contain"
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 40,
            top: 0,
            width: 310,
            height: 94,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #f9d878, #b98622)",
            color: "#171717",
            borderBottomLeftRadius: 22,
            borderBottomRightRadius: 22,
            fontSize: 36,
            fontWeight: 900
          }}
        >
          TOP OFERTA
        </div>
        <div
          style={{
            position: "absolute",
            left: 42,
            top: 132,
            width: 448,
            display: "flex",
            flexDirection: "column"
          }}
        >
          {brand ? (
            <div style={{ display: "flex", fontSize: 28, color: "#526078", fontWeight: 900, letterSpacing: 1, lineHeight: 1 }}>
              {brand}
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 10, fontSize: 38, fontWeight: 900, letterSpacing: 0, lineHeight: 0.96 }}>
            {headlineLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 14, fontSize: 22, color: "#222936", lineHeight: 1.08 }}>
            {detailLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          {modelYear ? (
            <div style={{ display: "flex", marginTop: 20, fontSize: 40, color: "#c5102f", fontWeight: 900, letterSpacing: 4 }}>{modelYear}</div>
          ) : null}
          <div style={{ display: "flex", marginTop: 16, fontSize: 44, color: "#002b66", fontWeight: 900 }}>{vehicle.price}</div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 32,
            bottom: 82,
            width: 650,
            height: 442,
            display: "flex",
            borderRadius: 30,
            overflow: "hidden",
            border: "8px solid rgba(255,255,255,0.86)"
          }}
        >
          <img
            src={imageUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            right: 36,
            bottom: 120,
            width: 300,
            height: 82,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            background: "linear-gradient(135deg, #d71934, #8f0b1d)",
            color: "#ffffff",
            borderRadius: 16,
            fontSize: 30,
            fontWeight: 900,
            lineHeight: 1
          }}
        >
          {badge}
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 82,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            background: "#111317",
            color: "#ffffff",
            fontSize: 24,
            fontWeight: 700
          }}
        >
          {specs.slice(0, 4).map((spec) => (
            <div key={spec} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
              {String(spec).toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
