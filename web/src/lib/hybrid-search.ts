import "server-only";
import type { ExploreStay, StaySearchResult } from "@/lib/queries";
import type { StaySearchParams } from "@/lib/stay-filters";

/**
 * Client for the FastAPI Hybrid Search backend (semantic + FTS + filters +
 * ranking). Called server-side from /search. Maps the existing StaySearchParams
 * (frontend filter vocabulary) onto the hybrid request and the hybrid response
 * back onto the ExploreStay shape the UI already renders — so the search UI is
 * unchanged. Returns null on any failure/timeout so the caller can fall back to
 * the direct-Supabase path (semantic search stays an enhancement, not a hard
 * dependency).
 */

const BASE = process.env.HYBRID_SEARCH_URL ?? "http://127.0.0.1:8000";
/**
 * Give up and fall back to direct Supabase after this long. Raise it via
 * HYBRID_SEARCH_TIMEOUT_MS when the API is on a free tier that cold-starts
 * (Render free sleeps after ~15 min and takes ~50s to wake).
 */
const TIMEOUT_MS = Number(process.env.HYBRID_SEARCH_TIMEOUT_MS ?? 8000);

type HybridProperty = {
  id: string;
  name: string;
  location: string;
  city: string | null;
  country: string | null;
  price: number | null;
  rating: number | null;
  reviews: number;
  image: string | null;
  latitude: number | null;
  longitude: number | null;
  superhost: boolean;
  beds: number | null;
  bathrooms: number | null;
};

type HybridResponse = {
  properties: HybridProperty[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
  meta: { semantic_enabled: boolean; intent_detected: string[] };
};

/**
 * "in" only when the query IS the place (e.g. "Barcelona" → "homes in
 * Barcelona"). Descriptive queries — including ones that merely mention a
 * place ("private pool in austin") — read better as "homes with …".
 */
function wherePreposition(where: string, detected: string[]): "in" | "with" {
  const q = where.trim().toLowerCase();
  if (!q) return "in";
  const places = detected
    .filter((d) => d.startsWith("city:") || d.startsWith("country:"))
    .map((d) => d.slice(d.indexOf(":") + 1).trim().toLowerCase());
  return places.includes(q) ? "in" : "with";
}

function toHybridBody(params: StaySearchParams) {
  const filters: Record<string, unknown> = {};
  if (params.price) {
    const [min, max] = params.price.split("-");
    if (min) filters.price_min = Number(min);
    if (max) filters.price_max = Number(max);
  }
  if (params.guests) filters.guests = params.guests;
  if (params.beds) filters.bedrooms = params.beds;
  if (params.bath) filters.bathrooms = params.bath;
  if (params.type) filters.room_type = params.type;
  if (params.ptype) filters.property_type = params.ptype;
  if (params.amenities?.length) filters.amenities = params.amenities;
  if (params.fav) {
    filters.rating_min = 4.9;
    filters.reviews_min = 50;
  }
  if (params.luxe) {
    filters.price_min = Math.max((filters.price_min as number) ?? 0, 500);
    filters.rating_min = Math.max((filters.rating_min as number) ?? 0, 4.5);
  }
  return {
    query: params.where?.trim() ?? "",
    filters,
    sort: params.sort ?? "recommended",
    page: params.page ?? 1,
    page_size: params.perPage ?? 24,
  };
}

function toExploreStay(p: HybridProperty): ExploreStay {
  const rating = p.rating ?? 0;
  return {
    id: p.id,
    name: p.name,
    location: p.location,
    price: Math.round(p.price ?? 0),
    rating,
    reviews: p.reviews,
    images: p.image ? [{ url: p.image, alt: p.name }] : [],
    isSuperhost: p.superhost,
    isRareFind: rating >= 4.95,
    latitude: p.latitude,
    longitude: p.longitude,
    beds: p.beds,
    bathrooms: p.bathrooms,
  };
}

export async function searchStaysHybrid(
  params: StaySearchParams,
): Promise<StaySearchResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/api/search/hybrid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toHybridBody(params)),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as HybridResponse;
    return {
      items: data.properties.map(toExploreStay),
      wherePreposition: wherePreposition(
        params.where ?? "",
        data.meta?.intent_detected ?? [],
      ),
      total: data.pagination.total,
      page: data.pagination.page,
      perPage: data.pagination.page_size,
      totalPages: data.pagination.total_pages,
    };
  } catch {
    return null; // unreachable / timeout / bad JSON → caller falls back
  } finally {
    clearTimeout(timer);
  }
}
