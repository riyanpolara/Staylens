/**
 * Ratings: formatting and the "N stars and up" filter vocabulary.
 *
 * Pure and free of server imports so Server Components, Client Components and
 * the hybrid-search mapper all agree on what a rating means and how it reads.
 *
 * Ratings are REAL. `properties.review_scores_rating` holds the imported Airbnb
 * score on a 0–100 scale; the UI divides by 20. Of 6,480 properties, 6,114 are
 * rated and 366 are not. Nothing here invents a number: an unrated property is
 * `null` and shows as "New", never as 0.0.
 */

/** A rating that may not exist yet. */
export type Rating = number | null;

/**
 * The badge value: one decimal, or "New" when there is nothing to show.
 *
 * "New" rather than "0.0" because a property with no reviews has not been rated
 * badly — it has not been rated. Showing 0.0 would be the worst possible lie
 * about a listing, and it is what `?? 0` used to produce.
 */
export function formatRating(rating: Rating): string {
  return typeof rating === "number" && Number.isFinite(rating)
    ? rating.toFixed(1)
    : "New";
}

/** Screen-reader phrasing, so the badge is not read as a bare number. */
export function ratingLabel(rating: Rating): string {
  return typeof rating === "number" && Number.isFinite(rating)
    ? `rated ${rating.toFixed(1)} out of 5`
    : "new listing, not yet rated";
}

/* ── Filter ──────────────────────────────────────────────────────────── */

export const RATING_FILTERS = ["all", "5", "4", "3", "2", "1"] as const;
export type RatingFilter = (typeof RATING_FILTERS)[number];

/**
 * Chip labels — each is one star band, not a floor.
 *
 * "4★" means 4.0–4.9, not "4 and up". The "& up" reading was the brief's first
 * spelling, but on this shelf every stay is 3.7 or higher, so "2★ & up" and
 * "1★ & up" both matched all twelve cards and looked like a filter that did
 * nothing. Bands make every chip narrow the list to exactly what it names.
 */
export const RATING_FILTER_LABEL: Record<RatingFilter, string> = {
  all: "All",
  "5": "5★",
  "4": "4★",
  "3": "3★",
  "2": "2★",
  "1": "1★",
};

/** Spelled out for the accessible name, where "4★" alone is ambiguous. */
export const RATING_FILTER_A11Y: Record<RatingFilter, string> = {
  all: "All ratings",
  "5": "Rated 5",
  "4": "Rated 4 to 4.9",
  "3": "Rated 3 to 3.9",
  "2": "Rated 2 to 2.9",
  "1": "Rated 1 to 1.9",
};

/**
 * Whether a rating falls in the chosen star band.
 *
 * Unrated listings appear only under "All". They are not 0, so they belong to
 * no band, and quietly dropping them from the rest is more honest than
 * pretending they sit somewhere on the scale.
 */
export function matchesRatingFilter(rating: Rating, filter: RatingFilter): boolean {
  if (filter === "all") return true;
  if (typeof rating !== "number" || !Number.isFinite(rating)) return false;

  // Banded on the DISPLAYED value, not the stored one. A stay scored 3.95
  // shows "4.0" on its badge; banding the raw number would file it under 3★
  // and leave a card reading 4.0 missing from the 4★ chip. The filter has to
  // agree with the badge, because the badge is the only number the guest sees.
  const shown = Number(rating.toFixed(1));

  // 5.0 floors to 5, so the top band needs no special case.
  return Math.floor(shown) === Number(filter);
}

/**
 * How the rating is stored: `review_scores_rating` is a smallint 0–100.
 *
 * The UI divides by 20. That divisor lives here so the band arithmetic below
 * and the badge above can never disagree about the scale.
 */
export const STORED_RATING_DIVISOR = 20;
export const STORED_RATING_MAX = 100;

/**
 * The stored-integer range behind each chip, derived rather than written down.
 *
 * Hand-deriving these is a trap. The column is a smallint, so a query cannot
 * ask for `>= 79.5`; and the integer boundaries are not where you would guess,
 * because `toFixed` rounds on the binary double: 59/20 renders "3.0" but 19/20
 * renders "0.9", since 2.95 lands just above its midpoint and 0.95 just below.
 *
 * So this walks every storable value through `formatRating` — the exact
 * function that paints the badge — and records which chip each one lands in.
 * 101 iterations, once per process. The bands are correct by construction: a
 * card can never display a number that puts it outside the chip it appears in.
 */
export function storedRatingBands(): Record<
  Exclude<RatingFilter, "all">,
  { lo: number; hi: number } | null
> {
  const out = {} as Record<Exclude<RatingFilter, "all">, { lo: number; hi: number } | null>;
  for (const f of RATING_FILTERS) {
    if (f !== "all") out[f] = null;
  }
  for (let stored = 0; stored <= STORED_RATING_MAX; stored++) {
    const chip = String(
      Math.floor(Number(formatRating(stored / STORED_RATING_DIVISOR))),
    ) as Exclude<RatingFilter, "all">;
    if (!(chip in out)) continue; // below 1.0 — no chip covers it
    const band = out[chip];
    out[chip] = band
      ? { lo: Math.min(band.lo, stored), hi: Math.max(band.hi, stored) }
      : { lo: stored, hi: stored };
  }
  return out;
}

/** Narrows an untrusted string (URL, storage) to a filter value. */
export function parseRatingFilter(value: string | null | undefined): RatingFilter {
  return (RATING_FILTERS as readonly string[]).includes(value ?? "")
    ? (value as RatingFilter)
    : "all";
}
