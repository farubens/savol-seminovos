export type ApiVehicle = {
  id: number;
  slug: string;
  url: string;
  name: string;
  subtitle: string;
  image: string;
  gallery: string[];
  year: string;
  transmission: string;
  fuel: string;
  km: string;
  store: string;
  oldPrice: string;
  price: string;
  qualityTag: string;
  secondaryHighlights: string[];
  brand: string;
  model: string;
  version: string;
  color: string;
  city: string;
  uf: string;
  molicar?: string;
  plate?: string;
};

export type ApiStore = {
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

export type HomeDataPayload = {
  vehicles: ApiVehicle[];
  stores: ApiStore[];
  fetchedAt: number;
};
