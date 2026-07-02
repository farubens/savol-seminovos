import type { ApiVehicle } from "@/types/home";

export type BodyInfo = { slug: string; label: string };
export type CategoryInfo = { slug: string; label: string };

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function hasAny(source: string, terms: string[]): boolean {
  return terms.some((term) => source.includes(term));
}

function hasToken(source: string, token: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`).test(source);
}

function energySource(vehicle: ApiVehicle): string {
  return normalize(`${vehicle.fuel} ${vehicle.category ?? ""} ${vehicle.body ?? ""} ${vehicle.name} ${vehicle.model} ${vehicle.version} ${vehicle.subtitle}`);
}

function bodyFromText(value: string): BodyInfo | null {
  const source = normalize(value);
  if (!source) return null;

  if (hasAny(source, ["suv", "crossover", "utilitario esportivo", "c4 cactus"])) return { slug: "suv", label: "SUV" };
  if (hasAny(source, ["hatch", "hatchback"])) return { slug: "hatch", label: "Hatch" };
  if (hasAny(source, ["sedan", "seda"])) return { slug: "sedan", label: "Sedan" };
  if (hasAny(source, ["pickup", "picape", "caminhonete", "cabine dupla", "cabine simples"])) return { slug: "pickup", label: "Pickup" };
  if (hasAny(source, ["coupe", "cupe"])) return { slug: "coupe", label: "Coupe" };
  if (hasAny(source, ["perua", "wagon"])) return { slug: "wagon", label: "Wagon" };
  if (hasAny(source, ["van", "furgao", "furgon", "utilitario", "comercial"])) return { slug: "van", label: "Van" };

  return null;
}

function bodyFromModel(vehicle: ApiVehicle): BodyInfo | null {
  const source = normalize(`${vehicle.brand} ${vehicle.name} ${vehicle.model} ${vehicle.version} ${vehicle.subtitle}`);

  if (
    hasAny(source, [
      "compass",
      "renegade",
      "commander",
      "creta",
      "tracker",
      "kicks",
      "t-cross",
      "tcross",
      "nivus",
      "taos",
      "tiggo",
      "song",
      "yuan",
      "corolla cross",
      "rav4",
      "sw4",
      "hr-v",
      "hrv",
      "wr-v",
      "wrv",
      "cr-v",
      "territory",
      "ecosport",
      "duster",
      "captur",
      "2008",
      "3008",
      "sportage",
      "sorento",
      "outlander",
      "trailblazer",
      "pulse",
      "fastback"
    ])
  ) {
    return { slug: "suv", label: "SUV" };
  }

  if (hasAny(source, ["strada", "toro", "hilux", "ranger", "s10", "montana", "saveiro", "amarok", "frontier", "rampage"])) {
    return { slug: "pickup", label: "Pickup" };
  }

  if (hasAny(source, ["ducato", "jumper", "expert", "master", "daily", "sprinter", "partner", "fiorino", "doblo", "kangoo", "kombi"])) {
    return { slug: "van", label: "Van" };
  }

  if (
    hasAny(source, [
      "cronos",
      "versa",
      "sentra",
      "corolla",
      "civic",
      "city",
      "virtus",
      "prisma",
      "cobalt",
      "onix plus",
      "hb20s",
      "elantra",
      "cerato",
      "jetta",
      "logan",
      "voyage"
    ])
  ) {
    return { slug: "sedan", label: "Sedan" };
  }

  if (hasAny(source, ["mobi", "argo", "onix", "hb20", "polo", "gol", "fox", "kwid", "sandero", "march", "fit", "208", "c3", "ka", "fiesta", "dolphin"])) {
    return { slug: "hatch", label: "Hatch" };
  }

  return null;
}

export function getBodyInfo(vehicle: ApiVehicle): BodyInfo {
  const fromBodyMeta = bodyFromText(vehicle.body ?? "");
  if (fromBodyMeta) return fromBodyMeta;

  const fromCategoryMeta = bodyFromText(vehicle.category ?? "");
  if (fromCategoryMeta) return fromCategoryMeta;

  const fromModel = bodyFromModel(vehicle);
  if (fromModel) return fromModel;

  return { slug: "outros", label: "Outros" };
}

export function getCategoryInfo(body: BodyInfo): CategoryInfo {
  if (body.slug === "suv") return { slug: "suv-crossover", label: "SUV e Crossover" };
  if (body.slug === "pickup") return { slug: "trabalho", label: "Trabalho" };
  if (body.slug === "van") return { slug: "utilitarios", label: "Utilitarios" };
  if (body.slug === "hatch" || body.slug === "sedan" || body.slug === "coupe" || body.slug === "wagon") return { slug: "passeio", label: "Passeio" };
  return { slug: "outros", label: "Outros" };
}

export function isElectricVehicle(vehicle: ApiVehicle): boolean {
  const source = energySource(vehicle);

  return (
    source.includes("eletric") ||
    source.includes("100 eletrico") ||
    hasToken(source, "bev") ||
    hasToken(source, "ev") ||
    hasAny(source, ["byd dolphin", "byd seal", "byd yuan"])
  );
}

export function isHybridVehicle(vehicle: ApiVehicle): boolean {
  const source = energySource(vehicle);

  return (
    source.includes("hibrid") ||
    source.includes("hybrid") ||
    source.includes("plug-in") ||
    source.includes("plug in") ||
    hasToken(source, "hev") ||
    hasToken(source, "mhev") ||
    hasToken(source, "phev")
  );
}

export function isElectrifiedVehicle(vehicle: ApiVehicle): boolean {
  return isElectricVehicle(vehicle) || isHybridVehicle(vehicle);
}
