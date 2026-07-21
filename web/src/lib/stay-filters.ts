/**
 * Pure, client-safe stay-search filter definitions shared by the server
 * search (lib/queries.ts) and the Filters modal's live count
 * (lib/search-client.ts). No next/headers imports here.
 */

export type SearchSort =
  | "recommended"
  | "rating"
  | "price_asc"
  | "price_desc"
  | "reviews";

export type StaySearchParams = {
  where?: string;
  guests?: number;
  /** price bucket, e.g. "100-200" or "500-" */
  price?: string;
  /** room_type enum value */
  type?: string;
  /** minimum bedrooms */
  beds?: number;
  /** minimum bathrooms (video's "1+ bathrooms" pill) */
  bath?: number;
  /** amenity slugs — AND semantics, like the video's quick pills */
  amenities?: string[];
  /** property_type value (modal's collapsible Property type) */
  ptype?: string;
  /** guest favourites: top-rated, well-reviewed only */
  fav?: boolean;
  /** standout "Luxe" — premium price tier */
  luxe?: boolean;
  sort?: SearchSort;
  page?: number;
  perPage?: number;
};

export const ROOM_TYPE_VALUES = [
  "Entire home/apt",
  "Private room",
  "Shared room",
  "Hotel room",
] as const;

/** Aliased inner joins for AND-semantics amenity filtering. */
export function amenitySelectSuffix(count: number): string {
  return Array.from({ length: count })
    .map((_, i) => `, pa${i}:property_amenities!inner(amenity_id)`)
    .join("");
}

/**
 * Chain the shared WHERE clauses onto a PostgrestFilterBuilder. Generic and
 * structurally typed so both server and browser clients can use it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyStayFilters<Q extends Record<string, any>>(
  q: Q,
  params: StaySearchParams,
  amenityIds: string[],
): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = q;
  query = query.eq("is_active", true).not("price", "is", null);

  amenityIds.forEach((id, i) => {
    query = query.eq(`pa${i}.amenity_id`, id);
  });

  if (params.where?.trim()) {
    const term = params.where.trim().replace(/[%,()]/g, "");
    query = query.or(
      `city.ilike.%${term}%,country.ilike.%${term}%,suburb.ilike.%${term}%`,
    );
  }
  if (params.guests && params.guests > 0) query = query.gte("accommodates", params.guests);
  if (params.price) {
    const [min, max] = params.price.split("-");
    if (min) query = query.gte("price", Number(min));
    if (max) query = query.lte("price", Number(max));
  }
  if (params.type && (ROOM_TYPE_VALUES as readonly string[]).includes(params.type)) {
    query = query.eq("room_type", params.type);
  }
  if (params.beds && params.beds > 0) query = query.gte("bedrooms", params.beds);
  if (params.bath && params.bath > 0) query = query.gte("bathrooms", params.bath);
  if (params.ptype?.trim()) query = query.eq("property_type", params.ptype.trim());
  if (params.fav) query = query.gte("review_scores_rating", 98).gte("number_of_reviews", 50);
  if (params.luxe) query = query.gte("price", 500).gte("review_scores_rating", 90);

  return query as Q;
}
