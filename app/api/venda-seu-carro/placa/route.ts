import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_PLATE_API_BASE_URL = "https://carscheduler.duckdns.org/vehicles/plate";
const PLATE_API_BASE_URL = (process.env.SAVOL_PLATE_API_BASE_URL?.trim() || DEFAULT_PLATE_API_BASE_URL).replace(/\/+$/, "");
const PLATE_API_USERNAME = process.env.SAVOL_PLATE_API_USERNAME?.trim() || "";
const PLATE_API_PASSWORD = process.env.SAVOL_PLATE_API_PASSWORD?.trim() || "";

type PlateVehicleData = {
  plate: string;
  brand: string;
  model: string;
  version: string;
  modelYear: string;
  manufactureYear: string;
  color: string;
  raw: unknown;
};

function normalizePlate(value: string | null): string {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findValue(source: unknown, aliases: string[], depth = 0): unknown {
  if (depth > 4 || !source) return undefined;

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findValue(item, aliases, depth + 1);
      if (found !== undefined && found !== null && cleanText(found) !== "") return found;
    }
    return undefined;
  }

  if (!isRecord(source)) return undefined;

  const normalizedAliases = aliases.map(normalizeKey);
  for (const [key, value] of Object.entries(source)) {
    if (normalizedAliases.includes(normalizeKey(key))) return value;
  }

  for (const value of Object.values(source)) {
    const found = findValue(value, aliases, depth + 1);
    if (found !== undefined && found !== null && cleanText(found) !== "") return found;
  }

  return undefined;
}

function normalizeYear(value: unknown): string {
  const text = cleanText(value);
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match?.[0] ?? text;
}

function normalizeVehicle(payload: unknown, plate: string): PlateVehicleData {
  return {
    plate,
    brand: cleanText(findValue(payload, ["brand", "marca", "make", "fabricante"])),
    model: cleanText(findValue(payload, ["model", "modelo", "name", "nomeModelo"])),
    version: cleanText(findValue(payload, ["version", "versao", "versão", "trim", "variant", "submodelo"])),
    modelYear: normalizeYear(findValue(payload, ["modelYear", "anoModelo", "ano_modelo", "anoModeloVeiculo"])),
    manufactureYear: normalizeYear(findValue(payload, ["manufactureYear", "anoFabricacao", "anoFabricação", "ano_fabricacao", "ano"])),
    color: cleanText(findValue(payload, ["color", "cor", "paint", "corVeiculo"])),
    raw: payload
  };
}

export async function GET(request: NextRequest) {
  const plate = normalizePlate(request.nextUrl.searchParams.get("placa"));
  if (plate.length !== 7) {
    return NextResponse.json({ ok: false, error: "Placa invalida." }, { status: 400 });
  }

  if (!PLATE_API_USERNAME || !PLATE_API_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Consulta de placa nao configurada." }, { status: 500 });
  }

  const auth = Buffer.from(`${PLATE_API_USERNAME}:${PLATE_API_PASSWORD}`, "utf8").toString("base64");
  const response = await fetch(`${PLATE_API_BASE_URL}/${encodeURIComponent(plate)}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Nao foi possivel consultar a placa.",
        status: response.status
      },
      { status: response.status }
    );
  }

  return NextResponse.json({
    ok: true,
    vehicle: normalizeVehicle(payload, plate)
  });
}
