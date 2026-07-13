import { NextRequest, NextResponse } from "next/server";
import { resolveSavolWhatsAppPhone } from "@/lib/savolWhatsApp";

const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 60;

type ApiStore = {
  id: number;
  slug: string;
  brand: string;
  name: string;
  address: string;
  phone: string;
  vehiclesCount: number;
  storeUrl: string;
  mapUrl: string;
};

export const dynamic = "force-dynamic";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toInt(value: string | null | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapUrl(value: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

const OFFICIAL_STORES: ApiStore[] = [
  {
    id: 1,
    slug: toSlug("Unidade SAVOL Toyota Santo André"),
    brand: "Toyota",
    name: "Unidade SAVOL Toyota Santo André",
    address: "Av. Artur de Queirós, 469 - Casa Branca, Santo André - SP, 09015-510",
    phone: resolveSavolWhatsAppPhone("Toyota"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Artur de Queirós, 469 - Casa Branca, Santo André - SP, 09015-510")
  },
  {
    id: 2,
    slug: toSlug("Unidade SAVOL Toyota São Bernardo do Campo"),
    brand: "Toyota",
    name: "Unidade SAVOL Toyota São Bernardo do Campo",
    address: "Av. Senador Vergueiro, 2332 - Anchieta, São Bernardo do Campo - SP, 09600-004",
    phone: resolveSavolWhatsAppPhone("Toyota"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Senador Vergueiro, 2332 - Anchieta, São Bernardo do Campo - SP, 09600-004")
  },
  {
    id: 3,
    slug: toSlug("Unidade SAVOL Toyota Mauá"),
    brand: "Toyota",
    name: "Unidade SAVOL Toyota Mauá",
    address: "Av. João Ramalho, 1853 - Vila Noêmia, Mauá - SP, 09371-520",
    phone: resolveSavolWhatsAppPhone("Toyota"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. João Ramalho, 1853 - Vila Noêmia, Mauá - SP, 09371-520")
  },
  {
    id: 4,
    slug: toSlug("Unidade SAVOL Toyota Praia Grande"),
    brand: "Toyota",
    name: "Unidade SAVOL Toyota Praia Grande",
    address: "Av. Guilhermina, 1021 - Guilhermina, Praia Grande - SP, 11701-500",
    phone: resolveSavolWhatsAppPhone("Toyota"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Guilhermina, 1021 - Guilhermina, Praia Grande - SP, 11701-500")
  },
  {
    id: 5,
    slug: toSlug("Unidade SAVOL Toyota Dom Pedro II"),
    brand: "Toyota",
    name: "Unidade SAVOL Toyota Dom Pedro II",
    address: "Av. Dom Pedro II, 2500 - Santo André - SP, 09080-110",
    phone: resolveSavolWhatsAppPhone("Toyota"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Dom Pedro II, 2500 - Santo André - SP, 09080-110")
  },
  {
    id: 6,
    slug: toSlug("Unidade SAVOL Volkswagen Santo André"),
    brand: "Volkswagen",
    name: "Unidade SAVOL Volkswagen Santo André",
    address: "Av. Artur de Queirós, 701 - Casa Branca, Santo André - SP, 09015-510",
    phone: resolveSavolWhatsAppPhone("Volkswagen"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Artur de Queirós, 701 - Casa Branca, Santo André - SP, 09015-510")
  },
  {
    id: 7,
    slug: toSlug("Unidade SAVOL Volkswagen Pereira Barreto"),
    brand: "Volkswagen",
    name: "Unidade SAVOL Volkswagen Pereira Barreto",
    address: "Av. Pereira Barreto, 888 - Paraíso, Santo André - SP, 09190-210",
    phone: resolveSavolWhatsAppPhone("Volkswagen"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Pereira Barreto, 888 - Paraíso, Santo André - SP, 09190-210")
  },
  {
    id: 8,
    slug: toSlug("Unidade SAVOL Peugeot Santo André"),
    brand: "Peugeot",
    name: "Unidade SAVOL Peugeot Santo André",
    address: "Av. Artur de Queirós, 426 - Casa Branca, Santo André - SP, 09015-510",
    phone: resolveSavolWhatsAppPhone("Peugeot"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Artur de Queirós, 426 - Casa Branca, Santo André - SP, 09015-510")
  },
  {
    id: 9,
    slug: toSlug("Unidade SAVOL Peugeot São Bernardo do Campo"),
    brand: "Peugeot",
    name: "Unidade SAVOL Peugeot São Bernardo do Campo",
    address: "Av. Senador Vergueiro, 2302 - Anchieta, São Bernardo do Campo - SP, 09600-004",
    phone: resolveSavolWhatsAppPhone("Peugeot"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Senador Vergueiro, 2302 - Anchieta, São Bernardo do Campo - SP, 09600-004")
  },
  {
    id: 10,
    slug: toSlug("Unidade SAVOL Peugeot São Caetano do Sul"),
    brand: "Peugeot",
    name: "Unidade SAVOL Peugeot São Caetano do Sul",
    address: "Av. Goiás, 2155 - Santo Antônio, São Caetano do Sul - SP, 09521-300",
    phone: resolveSavolWhatsAppPhone("Peugeot"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Goiás, 2155 - Santo Antônio, São Caetano do Sul - SP, 09521-300")
  },
  {
    id: 11,
    slug: toSlug("Unidade SAVOL Citroen Santo André"),
    brand: "Citroen",
    name: "Unidade SAVOL Citroen Santo André",
    address: "Av. Artur de Queirós, 424 - Casa Branca, Santo André - SP, 09015-510",
    phone: resolveSavolWhatsAppPhone("Citroen"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Artur de Queirós, 424 - Casa Branca, Santo André - SP, 09015-510")
  },
  {
    id: 12,
    slug: toSlug("Unidade SAVOL Citroen São Bernardo do Campo"),
    brand: "Citroen",
    name: "Unidade SAVOL Citroen São Bernardo do Campo",
    address: "Av. Senador Vergueiro, 2302 - Rudge Ramos, São Bernardo do Campo - SP, 09600-004",
    phone: resolveSavolWhatsAppPhone("Citroen"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Senador Vergueiro, 2302 - Rudge Ramos, São Bernardo do Campo - SP, 09600-004")
  },
  {
    id: 13,
    slug: toSlug("Unidade SAVOL Citroen São Caetano do Sul"),
    brand: "Citroen",
    name: "Unidade SAVOL Citroen São Caetano do Sul",
    address: "Av. Goiás, 2155 - Santo Antônio, São Caetano do Sul - SP, 09521-300",
    phone: resolveSavolWhatsAppPhone("Citroen"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Goiás, 2155 - Santo Antônio, São Caetano do Sul - SP, 09521-300")
  },
  {
    id: 14,
    slug: toSlug("Unidade SAVOL Fiat Santo André"),
    brand: "Fiat",
    name: "Unidade SAVOL Fiat Santo André",
    address: "Av. Artur de Queirós, 414 - Casa Branca, Santo André - SP, 09015-510",
    phone: resolveSavolWhatsAppPhone("Fiat"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Artur de Queirós, 414 - Casa Branca, Santo André - SP, 09015-510")
  },
  {
    id: 15,
    slug: toSlug("Unidade SAVOL Fiat São Caetano do Sul"),
    brand: "Fiat",
    name: "Unidade SAVOL Fiat São Caetano do Sul",
    address: "Av. Goiás, 2145 - Barcelona, São Caetano do Sul - SP, 09550-001",
    phone: resolveSavolWhatsAppPhone("Fiat"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Goiás, 2145 - Barcelona, São Caetano do Sul - SP, 09550-001")
  },
  {
    id: 16,
    slug: toSlug("Unidade SAVOL Fiat São Bernardo do Campo"),
    brand: "Fiat",
    name: "Unidade SAVOL Fiat São Bernardo do Campo",
    address: "Av. Senador Vergueiro, 2348 - Anchieta, São Bernardo do Campo - SP, 09600-004",
    phone: resolveSavolWhatsAppPhone("Fiat"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Senador Vergueiro, 2348 - Anchieta, São Bernardo do Campo - SP, 09600-004")
  },
  {
    id: 17,
    slug: toSlug("Unidade SAVOL Kia Santo André"),
    brand: "Kia",
    name: "Unidade SAVOL Kia Santo André",
    address: "Av. Artur de Queirós, 727 - Casa Branca, Santo André - SP, 09015-510",
    phone: resolveSavolWhatsAppPhone("Kia"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Artur de Queirós, 727 - Casa Branca, Santo André - SP, 09015-510")
  },
  {
    id: 18,
    slug: toSlug("Unidade SAVOL Kia São Paulo"),
    brand: "Kia",
    name: "Unidade SAVOL Kia São Paulo",
    address: "Av. Nazaré, 444 - Ipiranga, São Paulo - SP, 04262-000",
    phone: resolveSavolWhatsAppPhone("Kia"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Nazaré, 444 - Ipiranga, São Paulo - SP, 04262-000")
  },
  {
    id: 19,
    slug: toSlug("Unidade SAVOL MG Motor"),
    brand: "MG Motor",
    name: "Unidade SAVOL MG Motor São Caetano",
    address: "Av. Goiás, 3048 - Santo Antônio, São Caetano do Sul - SP, 09521-310",
    phone: resolveSavolWhatsAppPhone("MG Motor"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Goiás, 3048 - Santo Antônio, São Caetano do Sul - SP, 09521-310")
  },
  {
    id: 20,
    slug: toSlug("Unidade SAVOL JETOUR"),
    brand: "Jetour",
    name: "Unidade SAVOL JETOUR Santo André",
    address: "Av. D. Pedro II, 2550 - Bairro Campestre, Santo André - SP, 09080-111",
    phone: resolveSavolWhatsAppPhone("Jetour"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. D. Pedro II, 2550 - Bairro Campestre, Santo André - SP, 09080-111")
  },
  {
    id: 21,
    slug: toSlug("Unidade SAVOL JETOUR São Caetano do Sul"),
    brand: "Jetour",
    name: "Unidade SAVOL JETOUR São Caetano do Sul",
    address: "Alameda Terracota, 545 - Piso 1, Térreo - Cerâmica, São Caetano do Sul - SP, 09531-190",
    phone: resolveSavolWhatsAppPhone("Jetour"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Alameda Terracota, 545 - Piso 1, Térreo - Cerâmica, São Caetano do Sul - SP, 09531-190")
  },
  {
    id: 22,
    slug: toSlug("Unidade SAVOL MG Motor Anália Franco"),
    brand: "MG Motor",
    name: "Unidade SAVOL MG Motor Anália Franco",
    address: "Av. Regente Feijó, 1739 - Jardim Anália Franco, São Paulo - SP, 03342-000",
    phone: resolveSavolWhatsAppPhone("MG Motor"),
    vehiclesCount: 0,
    storeUrl: "/lojas",
    mapUrl: mapUrl("Av. Regente Feijó, 1739 - Jardim Anália Franco, São Paulo - SP, 03342-000")
  }
];

export async function GET(request: NextRequest) {
  const perPageInput = toInt(request.nextUrl.searchParams.get("per_page"), DEFAULT_PER_PAGE);
  const perPage = clamp(perPageInput, 1, MAX_PER_PAGE);
  return NextResponse.json({ items: OFFICIAL_STORES.slice(0, perPage) });
}
