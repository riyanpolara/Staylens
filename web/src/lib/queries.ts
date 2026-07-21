import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import {
  amenitySelectSuffix,
  applyStayFilters,
  type StaySearchParams,
} from "@/lib/stay-filters";
import type { Tables } from "@/lib/database.types";

export type City = Tables<"cities"> & { properties: { count: number }[] };
export type PropertyCard = Pick<
  Tables<"properties">,
  | "id"
  | "name"
  | "price"
  | "city"
  | "country"
  | "room_type"
  | "property_type"
  | "accommodates"
  | "bedrooms"
  | "review_scores_rating"
  | "number_of_reviews"
> & { property_images: { url: string }[] };

/** All cities with their property counts, busiest first. */
export async function getCities() {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("cities")
    .select("*, properties(count)")
    .order("city_name");
  if (error) throw error;
  return (data as City[])
    .filter((c) => (c.properties[0]?.count ?? 0) > 0)
    .sort((a, b) => (b.properties[0]?.count ?? 0) - (a.properties[0]?.count ?? 0));
}

/** Top-rated, well-reviewed properties for the landing grid. */
export async function getFeaturedProperties(limit = 8) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      `id, name, price, city, country, room_type, property_type,
       accommodates, bedrooms, review_scores_rating, number_of_reviews,
       property_images!inner(url)`,
    )
    .eq("is_active", true)
    .eq("property_images.is_primary", true)
    .not("review_scores_rating", "is", null)
    .order("review_scores_rating", { ascending: false })
    .order("number_of_reviews", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as PropertyCard[];
}

/** Full property detail incl. host, images, amenities and latest reviews. */
export async function getProperty(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      `*,
       hosts(*),
       cities(*),
       property_images(url, image_type, is_primary, sort_order),
       property_amenities(amenities(name, slug, category)),
       reviews(reviewer_name, review_date, comments)`,
    )
    .eq("id", id)
    .order("review_date", { referencedTable: "reviews", ascending: false })
    .single();
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ *
 *  Property Details page — display-shaped data
 * ------------------------------------------------------------------ */

export type PropertyDetail = {
  id: string;
  name: string;
  description: string | null;
  summary: string | null;
  neighborhoodOverview: string | null;
  propertyType: string | null;
  roomType: string | null;
  price: number;
  cleaningFee: number | null;
  currency: string;
  rating: number; // 0–5
  reviewsCount: number;
  accommodates: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  minimumNights: number | null;
  maximumNights: number | null;
  availability365: number | null;
  city: string | null;
  country: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  images: { url: string; alt: string }[];
  amenities: { name: string; slug: string; category: string | null }[];
  /** 0–5 sub-scores (DB stores 0–10) */
  scores: {
    accuracy: number | null;
    cleanliness: number | null;
    checkin: number | null;
    communication: number | null;
    location: number | null;
    value: number | null;
  };
  reviews: { reviewerName: string | null; date: string | null; comment: string }[];
  host: {
    name: string | null;
    about: string | null;
    pictureUrl: string | null;
    isSuperhost: boolean;
    identityVerified: boolean;
    responseRate: number | null;
    responseTime: string | null;
    listingsCount: number | null;
  } | null;
};

/**
 * Convert a stored review score to the 0–5 scale the UI expects, rounded to
 * one decimal. `review_scores_rating` is stored 0–100 (divisor 20); the six
 * sub-scores are stored 0–10 (divisor 2).
 */
const to5 = (v: number | null, divisor: number): number | null =>
  v === null || v === undefined ? null : Math.round((v / divisor) * 10) / 10;

/** Full property detail for /property/[id] (cookie-free → ISR-cacheable). */
export async function getPropertyDetail(id: string): Promise<PropertyDetail | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      `id, name, description, summary, neighborhood_overview, property_type,
       room_type, price, cleaning_fee, currency, review_scores_rating,
       number_of_reviews, accommodates, bedrooms, beds, bathrooms,
       minimum_nights, maximum_nights, availability_365,
       suburb, government_area, city, country, latitude, longitude,
       review_scores_accuracy, review_scores_cleanliness, review_scores_checkin,
       review_scores_communication, review_scores_location, review_scores_value,
       cities(city_name, country),
       property_images(url, sort_order),
       property_amenities(amenities(name, slug, category)),
       hosts(name, about, picture_url, thumbnail_url, is_superhost,
             identity_verified, response_rate, response_time, listings_count),
       reviews(reviewer_name, review_date, comments)`,
    )
    .eq("id", id)
    .order("review_date", { referencedTable: "reviews", ascending: false })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const host = d.hosts;
  const cityName = d.cities?.city_name ?? d.city;
  const country = d.cities?.country ?? d.country;
  const clean = (v: string | null) =>
    v && !/neighborhood highlights/i.test(v) && !/^\d+$/.test(v.trim()) ? v : null;

  return {
    id: d.id,
    name: d.name,
    description: d.description,
    summary: d.summary,
    neighborhoodOverview: d.neighborhood_overview,
    propertyType: d.property_type,
    roomType: d.room_type,
    price: Math.round(d.price ?? 0),
    cleaningFee: d.cleaning_fee ? Math.round(d.cleaning_fee) : null,
    currency: d.currency ?? "USD",
    rating: to5(d.review_scores_rating, 20) ?? 0,
    reviewsCount: d.number_of_reviews ?? 0,
    accommodates: d.accommodates,
    bedrooms: d.bedrooms,
    beds: d.beds,
    bathrooms: d.bathrooms,
    minimumNights: d.minimum_nights,
    maximumNights: d.maximum_nights,
    availability365: d.availability_365,
    city: cityName,
    country,
    area: clean(d.government_area) ?? clean(d.suburb) ?? cityName,
    latitude: d.latitude,
    longitude: d.longitude,
    images: (d.property_images ?? [])
      .slice()
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map((img: { url: string }) => ({ url: img.url, alt: d.name })),
    amenities: (d.property_amenities ?? [])
      .map((pa: { amenities: { name: string; slug: string; category: string | null } | null }) => pa.amenities)
      .filter(Boolean),
    scores: {
      accuracy: to5(d.review_scores_accuracy, 2),
      cleanliness: to5(d.review_scores_cleanliness, 2),
      checkin: to5(d.review_scores_checkin, 2),
      communication: to5(d.review_scores_communication, 2),
      location: to5(d.review_scores_location, 2),
      value: to5(d.review_scores_value, 2),
    },
    reviews: (d.reviews ?? [])
      .filter((r: { comments: string | null }) => r.comments?.trim())
      .map((r: { reviewer_name: string | null; review_date: string | null; comments: string }) => ({
        reviewerName: r.reviewer_name,
        date: r.review_date,
        comment: r.comments,
      })),
    host: host
      ? {
          name: host.name,
          about: host.about,
          pictureUrl: host.picture_url ?? host.thumbnail_url,
          isSuperhost: host.is_superhost ?? false,
          identityVerified: host.identity_verified ?? false,
          responseRate: host.response_rate,
          responseTime: host.response_time,
          listingsCount: host.listings_count,
        }
      : null,
  };
}

/** All property ids (for related-links / static params if needed). */
export async function getPropertyIds(limit = 100): Promise<string[]> {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("properties")
    .select("id")
    .eq("is_active", true)
    .limit(limit);
  return (data ?? []).map((r) => r.id);
}

/** Keyword search until embeddings are generated (then switch to match_properties RPC). */
export async function searchProperties(term: string, limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      `id, name, price, city, country, room_type, property_type,
       accommodates, bedrooms, review_scores_rating, number_of_reviews,
       property_images!inner(url)`,
    )
    .eq("is_active", true)
    .eq("property_images.is_primary", true)
    .textSearch("description", term, { type: "websearch", config: "english" })
    .limit(limit);
  if (error) throw error;
  return data as PropertyCard[];
}

/** "More like this" — content-based recommendations via pgvector. */
export async function getSimilarProperties(propertyId: string, count = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("similar_properties", {
    source_property_id: propertyId,
    match_count: count,
  });
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ *
 *  Explore screen — display-shaped data
 * ------------------------------------------------------------------ */

/** Card-ready stay: DB fields mapped to what the Stitch card displays. */
export type ExploreStay = {
  id: string;
  name: string;
  /** e.g. "Waikiki, United States" — area/suburb first, like the design */
  location: string;
  /** nightly price in USD, rounded */
  price: number;
  /** 0–5 scale, two decimals (DB stores 0–100) */
  rating: number;
  reviews: number;
  images: { url: string; alt: string }[];
  isSuperhost: boolean;
  /** top ratings get the design's "Rare Find" badge */
  isRareFind: boolean;
  /** for the map pins */
  latitude: number | null;
  longitude: number | null;
  /** shown in the map popup card ("1 bed · 1 bathroom") */
  beds?: number | null;
  bathrooms?: number | null;
};

const STAY_SELECT = `id, name, price, suburb, government_area,
       review_scores_rating, number_of_reviews, latitude, longitude,
       beds, bathrooms,
       cities(city_name, country),
       property_images(url, sort_order),
       hosts(is_superhost)` as const;

function toExploreStay(row: {
  id: string;
  name: string;
  price: number | null;
  suburb: string | null;
  government_area: string | null;
  review_scores_rating: number | null;
  number_of_reviews: number;
  latitude?: number | null;
  longitude?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
  cities: { city_name: string; country: string | null } | null;
  property_images: { url: string; sort_order: number }[];
  hosts: { is_superhost: boolean } | null;
}): ExploreStay {
  // Prefer IA's cleansed area, but skip scrape artifacts: free-text junk
  // ("Neighborhood highlights") and numeric-only areas (Austin uses ZIPs).
  const clean = (v: string | null) =>
    v && !/neighborhood highlights/i.test(v) && !/^\d+$/.test(v.trim()) ? v : null;
  const area =
    clean(row.government_area) ?? clean(row.suburb) ?? row.cities?.city_name ?? "";
  const country = row.cities?.country ?? "";
  const rating = Math.round(((row.review_scores_rating ?? 0) / 20) * 100) / 100;
  return {
    id: row.id,
    name: row.name,
    location: [area, country].filter(Boolean).join(", "),
    price: Math.round(row.price ?? 0),
    rating,
    reviews: row.number_of_reviews,
    images: [...row.property_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ url: img.url, alt: row.name })),
    isSuperhost: row.hosts?.is_superhost ?? false,
    isRareFind: rating >= 4.95,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    beds: row.beds ?? null,
    bathrooms: row.bathrooms ?? null,
  };
}

/**
 * Top-rated, heavily-reviewed stays for the "Curated Collections" bento.
 * Ordered by rating then review count so the picks are credible.
 */
export async function getExploreStays(limit = 3): Promise<ExploreStay[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("properties")
    .select(STAY_SELECT)
    .eq("is_active", true)
    .not("price", "is", null)
    .not("review_scores_rating", "is", null)
    .gte("number_of_reviews", 100)
    .order("review_scores_rating", { ascending: false })
    .order("number_of_reviews", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toExploreStay);
}

/* ------------------------------------------------------------------ *
 *  Search Results screen
 * ------------------------------------------------------------------ */

export type { SearchSort, StaySearchParams } from "@/lib/stay-filters";

export type StaySearchResult = {
  items: ExploreStay[];
  /**
   * Preposition for the results heading: "in" when the query is an actual
   * place ("450 homes in Barcelona"), "with" when it's a descriptive query
   * ("226 homes with sunset view"). Set by the hybrid search client from the
   * detected intent; the Supabase fallback searches by location, so "in".
   */
  wherePreposition?: "in" | "with";
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

/** Resolve amenity slugs → ids (tiny lookup; slugs come from the UI). */
async function amenityIdsForSlugs(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("amenities")
    .select("id, slug")
    .in("slug", slugs);
  return (data ?? []).map((a) => a.id);
}

/** Filtered, sorted, paginated stay search for /search. */
export async function searchStays(params: StaySearchParams): Promise<StaySearchResult> {
  const supabase = createStaticClient();
  const page = Math.max(1, params.page ?? 1);
  const perPage = params.perPage ?? 24;

  // AND-filter amenities via aliased inner joins (pa0, pa1, …)
  const amenityIds = await amenityIdsForSlugs((params.amenities ?? []).slice(0, 10));
  const select = STAY_SELECT + amenitySelectSuffix(amenityIds.length);

  let q = supabase
    .from("properties")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select(select as any, { count: "exact" });
  q = applyStayFilters(q, params, amenityIds);

  switch (params.sort ?? "recommended") {
    case "price_asc":
      q = q.order("price", { ascending: true });
      break;
    case "price_desc":
      q = q.order("price", { ascending: false });
      break;
    case "rating":
      q = q
        .order("review_scores_rating", { ascending: false, nullsFirst: false })
        .order("number_of_reviews", { ascending: false });
      break;
    case "reviews":
      q = q.order("number_of_reviews", { ascending: false });
      break;
    default: // recommended — credible quality first
      q = q
        .order("review_scores_rating", { ascending: false, nullsFirst: false })
        .order("number_of_reviews", { ascending: false });
  }
  // stable tiebreaker so pagination never repeats rows
  q = q.order("id", { ascending: true });

  const from = (page - 1) * perPage;
  const { data, error, count } = await q.range(from, from + perPage - 1);
  if (error) throw error;

  const total = count ?? 0;
  // dynamic select string (amenity join aliases) loosens the row typing
  const rows = (data ?? []) as unknown as Parameters<typeof toExploreStay>[0][];
  return {
    items: rows.map(toExploreStay),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Live city suggestions for the search "Where" panel (shared by pages). */
export async function getSearchSuggestionList() {
  const cities = await getCities();
  return [
    { id: "nearby", label: "Nearby", sub: "Find what's around you" },
    ...cities.slice(0, 5).map((c) => ({
      id: c.id,
      label: c.city_name,
      sub: `Stays in ${c.country ?? "popular areas"}`,
    })),
  ];
}

/** Destination tile for "Where to next?" — a top city + a hero photo. */
export type CityDestination = {
  id: string;
  title: string;
  image?: string;
  imageAlt?: string;
  /** solid brand tile (design pattern) when no image is used */
  tileLabel?: string;
};

/**
 * Top cities by property count, each illustrated with the photo of its
 * most-reviewed property. One tile is rendered as the design's solid
 * text tile.
 */
export async function getTopCityDestinations(count = 4): Promise<CityDestination[]> {
  const supabase = createStaticClient();
  const cities = await getCities();
  const top = cities.slice(0, count);

  const images = await Promise.all(
    top.map(async (city) => {
      const { data } = await supabase
        .from("properties")
        .select("property_images(url)")
        .eq("city_id", city.id)
        .eq("is_active", true)
        .order("number_of_reviews", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.property_images?.[0]?.url;
    }),
  );

  return top.map((city, i) =>
    // the second tile is the solid brand tile, matching the Stitch design
    i === 1
      ? { id: city.id, title: city.city_name, tileLabel: city.city_name }
      : {
          id: city.id,
          title: city.city_name,
          image: images[i],
          imageAlt: `Stay in ${city.city_name}`,
        },
  );
}
