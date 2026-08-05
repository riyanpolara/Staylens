import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import {
  amenitySelectSuffix,
  applyStayFilters,
  type StaySearchParams,
} from "@/lib/stay-filters";
import type { Tables } from "@/lib/database.types";
import { cleanListingText, cleanListingTextOrNull } from "@/lib/listing-text";
import { storedRatingBands } from "@/lib/rating";

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
async function fetchCities() {
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

/**
 * City list with per-city property counts. This drives the search "Where"
 * suggestions on the landing, search and property pages, so it was previously
 * re-queried (full table scan + count aggregate) on every single request.
 * The catalog changes rarely, so it's cached in the Next data cache and shared
 * across requests — safe because it uses the cookie-free static client and
 * contains no user-scoped data.
 */
export const getCities = unstable_cache(fetchCities, ["cities-with-counts"], {
  revalidate: 3600,
  tags: ["cities"],
});

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
    // Stripped here rather than in each component: the import left literal
    // `<br />` in 2,328 of the 6,480 rows, and anything reading these fields
    // wants prose, not markup.
    description: cleanListingTextOrNull(d.description),
    summary: cleanListingTextOrNull(d.summary),
    neighborhoodOverview: cleanListingTextOrNull(d.neighborhood_overview),
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
        // Guests typed these into the same rich-text box: 4,106 of the 43,307
        // review rows carry `<br/>`, and they render on this page too.
        comment: cleanListingText(r.comments),
      })),
    host: host
      ? {
          name: host.name,
          about: cleanListingTextOrNull(host.about),
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
/**
 * The AI Match for one stay against one search.
 *
 * Every number here is produced by the hybrid ranking engine
 * (`backend/app/ranking/ranking_engine.py`) — a weighted sum of normalized
 * signals, not a generated figure. `signals` is the same breakdown the engine
 * scored with, so the percentage can always be decomposed.
 *
 * Null whenever there is nothing to match against: no query, no embeddings, or
 * the Supabase fallback path. The badge is hidden rather than invented.
 */
export type MatchScore = {
  /** 0–100, rounded from the engine's weighted total. */
  score: number;
  /** Per-signal contributions, 0–1, as scored. */
  signals: {
    semantic: number;
    text: number;
    rating: number;
    reviews: number;
    superhost: number;
    amenity: number;
    popularity: number;
  };
  /** "✓ …" and "✗ …" lines straight from the engine. */
  explanation: string[];
};

export type ExploreStay = {
  id: string;
  name: string;
  /** e.g. "Waikiki, United States" — area/suburb first, like the design */
  location: string;
  /** nightly price in USD, rounded */
  price: number;
  /**
   * 0–5 scale (DB stores 0–100), or null when the listing has no score yet.
   *
   * Nullable on purpose. 366 of the 6,480 properties are unrated, and the old
   * `?? 0` turned "not rated" into a flat 0.0 — the single most damaging thing
   * a listing page can claim about a property. Callers render `formatRating`,
   * which says "New".
   */
  rating: number | null;
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
  /** Present only for hybrid-search results with a real query. */
  match?: MatchScore | null;
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
  // Null stays null: an unrated listing is not a zero-rated one.
  const rating =
    row.review_scores_rating === null || row.review_scores_rating === undefined
      ? null
      : Math.round((row.review_scores_rating / 20) * 100) / 100;
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
    isRareFind: rating !== null && rating >= 4.95,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    beds: row.beds ?? null,
    bathrooms: row.bathrooms ?? null,
  };
}

/**
 * How many reviews a band's rating must rest on.
 *
 * A rating from a single review is thin evidence, so the crowded top bands
 * demand five. But the whole catalogue holds just 14 listings below 3.0 and
 * every one has fewer than five reviews — applying the strict floor there
 * leaves the 2★ and 1★ chips permanently empty, which is how they behaved
 * before. Taking what exists is the only alternative to inventing listings.
 */
const MIN_REVIEWS_BY_CHIP: Record<string, number> = {
  "5": 5,
  "4": 5,
  "3": 5,
  "2": 1,
  "1": 1,
};

/**
 * How many candidates to pull per slot, so dead photos can be skipped.
 *
 * Three. Measured: 2 of 15 lead photos were 404ing, so one spare per slot would
 * usually do — three leaves room for a band where several have rotted, without
 * checking the whole catalogue.
 */
const IMAGE_CANDIDATE_MULTIPLE = 3;

/** Chips in the order the shelf presents them: best band first. */
const CHIPS_BEST_FIRST = ["5", "4", "3", "2", "1"] as const;

/**
 * Whether a listing's lead photo actually loads.
 *
 * The imported photos are Airbnb CDN URLs and they expire. Two of the fifteen
 * cards on this shelf were already 404ing, which is what put a broken-image
 * icon and a line of alt text where a photo should be. Nothing in the database
 * records that — the row is present and looks fine — so the only way to know is
 * to ask.
 *
 * A ranged GET rather than HEAD: some CDNs answer HEAD with 405 while serving
 * the image perfectly well, which would discard good listings. Sixty-four bytes
 * is enough to learn the status code.
 *
 * Any failure counts as dead, including the timeout. This runs behind an hourly
 * cache, so the cost is one sweep per hour, not one per visitor — and a slow
 * CDN must never be able to hang a page render.
 */
async function imageLoads(url: string, timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Range: "bytes=0-63" },
      cache: "no-store",
      signal: controller.signal,
    });
    return res.status === 200 || res.status === 206;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The first `want` stays whose lead photo is live, checked in parallel.
 *
 * Candidates stay in recommendation order, so this only ever removes — it never
 * promotes a weaker listing above a stronger one that happens to load faster.
 */
async function withLiveImages(
  candidates: ExploreStay[],
  want: number,
): Promise<ExploreStay[]> {
  const alive = await Promise.all(
    candidates.map(async (stay) => {
      const url = stay.images[0]?.url;
      return url ? await imageLoads(url) : false;
    }),
  );
  return candidates.filter((_, i) => alive[i]).slice(0, want);
}

async function fetchRecommendedStays(perBand: number): Promise<ExploreStay[]> {
  const supabase = createStaticClient();

  // One small indexed query per band, in parallel. Ordering *within* a band is
  // by review volume: among equally-rated stays, the one 800 guests agreed on
  // is the better recommendation.
  // Integer bounds derived from `formatRating` itself, so a band can never
  // include a listing whose badge would place it in a different chip. The
  // column is a smallint, so fractional bounds are not an option anyway.
  const storedBands = storedRatingBands();

  const bands = await Promise.all(
    CHIPS_BEST_FIRST.map(async (chip) => {
      const band = storedBands[chip];
      if (!band) return [];
      // Over-fetch so a dead photo costs the shelf a card rather than a slot:
      // the next-best listing in the same band takes its place.
      const { data, error } = await supabase
        .from("properties")
        .select(STAY_SELECT)
        .eq("is_active", true)
        .not("price", "is", null)
        .gte("review_scores_rating", band.lo)
        .lte("review_scores_rating", band.hi)
        .gte("number_of_reviews", MIN_REVIEWS_BY_CHIP[chip] ?? 1)
        .order("number_of_reviews", { ascending: false })
        .limit(perBand * IMAGE_CANDIDATE_MULTIPLE);
      if (error) throw error;
      return withLiveImages((data ?? []).map(toExploreStay), perBand);
    }),
  );

  // Concatenated best-band-first, so the carousel still opens on the strongest
  // recommendations. Empty bands simply contribute nothing — this catalogue has
  // no credibly-rated listing below 3.0, and inventing one is not an option.
  return bands.flat();
}

/**
 * Stays for the "AI-recommended retreats" carousel.
 *
 * Deliberately NOT "the top N by rating". That query returns 5.00 for the first
 * 127 rows — 932 properties are a perfect 100/100 — which is why every card on
 * the homepage read the same score, and why a rating filter over it would have
 * been decoration: every chip would return the identical set.
 *
 * So the set is drawn across rating bands instead. The recommendation signal is
 * unchanged (rating first, then review volume) and the cards are still ordered
 * best-first; what changes is that the shelf now spans the range that actually
 * exists in the data, which is what gives the filter something to filter.
 *
 * Cached like `getCities`: the catalogue turns over far more slowly than the
 * page is requested, and this is six queries rather than one.
 */
export const getRecommendedStays = unstable_cache(
  fetchRecommendedStays,
  ["recommended-stays-by-band"],
  { revalidate: 3600, tags: ["properties"] },
);

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
