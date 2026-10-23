// Saudi cities with real coordinates، used for the live quote estimate (haversine
// distance) and for placing nodes on the drawn Kingdom map.
export type CityKey =
  | 'riyadh' | 'jeddah' | 'dammam' | 'makkah' | 'madinah'
  | 'abha' | 'tabuk' | 'jubail' | 'qassim' | 'hail';

export interface City {
  key: CityKey;
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  { key: 'riyadh',  lat: 24.71, lng: 46.68 },
  { key: 'jeddah',  lat: 21.49, lng: 39.19 },
  { key: 'dammam',  lat: 26.43, lng: 50.10 },
  { key: 'makkah',  lat: 21.39, lng: 39.86 },
  { key: 'madinah', lat: 24.52, lng: 39.57 },
  { key: 'abha',    lat: 18.22, lng: 42.51 },
  { key: 'tabuk',   lat: 28.38, lng: 36.57 },
  { key: 'jubail',  lat: 27.00, lng: 49.66 },
  { key: 'qassim',  lat: 26.33, lng: 43.97 },
  { key: 'hail',    lat: 27.52, lng: 41.69 },
];

export const CITY_MAP: Record<CityKey, City> = Object.fromEntries(
  CITIES.map((c) => [c.key, c]),
) as Record<CityKey, City>;

// Map geographic bounds → a 100×100 viewBox for the drawn map.
const BOUNDS = { minLng: 34.5, maxLng: 51.5, minLat: 16.5, maxLat: 30.5 };

export function project(city: City): { x: number; y: number } {
  const x = ((city.lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = (1 - (city.lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return { x, y };
}

export function haversineKm(a: City, b: City): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  // Road factor ~1.25 over great-circle distance.
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.25;
}

export type CargoKey = 'general' | 'refrigerated' | 'heavy' | 'containers';

// SAR per km by cargo type, plus a fixed handling base.
const RATE: Record<CargoKey, number> = {
  general: 3.1,
  refrigerated: 4.4,
  heavy: 5.8,
  containers: 3.9,
};
const BASE_FEE = 320;

export function estimatePrice(km: number, cargo: CargoKey): number {
  const raw = BASE_FEE + km * RATE[cargo];
  return Math.round(raw / 50) * 50; // round to nearest 50 SAR
}

// A deterministic "carriers on this lane" count so it is stable per route
// (no hydration mismatch) yet varies believably by distance.
export function carriersOnLane(a: City, b: City): number {
  const seed = Math.abs(Math.round((a.lat + b.lng) * 7 + (b.lat + a.lng) * 3));
  return 6 + (seed % 23);
}
