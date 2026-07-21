/**
 * Shared price-pin layout for the map preview panels. Normalizes lat/lng
 * into percentage positions and runs a small greedy de-overlap pass so
 * pins don't stack on top of each other.
 */

export type MapPinInput = {
  id: string;
  name: string;
  price: number;
  latitude: number | null;
  longitude: number | null;
  /* --- optional fields rendered in the map popup card --- */
  image?: string | null;
  location?: string | null;
  rating?: number | null;
  reviews?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
  /** pre-formatted, e.g. "$1,764 for 9 nights" or "$196 / night" */
  priceLabel?: string;
};

export type PlacedPin = {
  id: string;
  name: string;
  price: number;
  left: number; // percent
  top: number; // percent
};

const PAD = 7; // % padding inside the panel
const MIN_DX = 9; // pins closer than this (in %) are considered colliding…
const MIN_DY = 6; // …when also vertically closer than this

export function layoutPins(pins: MapPinInput[]): PlacedPin[] {
  const located = pins.filter(
    (p) => p.latitude !== null && p.longitude !== null,
  );
  if (located.length === 0) return [];

  const lats = located.map((p) => p.latitude!);
  const lngs = located.map((p) => p.longitude!);
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const spanLat = Math.max(maxLat - minLat, 1e-6);
  const spanLng = Math.max(maxLng - minLng, 1e-6);
  const usable = 100 - PAD * 2;

  const placed: PlacedPin[] = [];
  for (const p of located) {
    let left = PAD + ((p.longitude! - minLng) / spanLng) * usable;
    let top = PAD + (1 - (p.latitude! - minLat) / spanLat) * usable;

    // greedy de-overlap: nudge down (then right) until clear or give up
    for (let attempt = 0; attempt < 6; attempt++) {
      const hit = placed.find(
        (q) => Math.abs(q.left - left) < MIN_DX && Math.abs(q.top - top) < MIN_DY,
      );
      if (!hit) break;
      top = top + MIN_DY > 100 - PAD ? top - MIN_DY : top + MIN_DY;
      if (attempt >= 3) left = Math.min(100 - PAD, left + MIN_DX / 2);
    }
    placed.push({ id: p.id, name: p.name, price: p.price, left, top });
  }
  return placed;
}
