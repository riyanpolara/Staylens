import type { SearchState } from "@/components/search/search-types";
import { EMPTY_SEARCH } from "@/components/search/search-types";
import {
  EMPTY_FLEXIBLE,
  buildFlexibleQuery,
  parseFlexibleQuery,
  type FlexibleSearch,
} from "@/components/search/flexible-search-state";

/** yyyy-mm-dd for the search URL (local date, not UTC). */
function toParam(d: Date | null): string | null {
  if (!d) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Build the ?where=&in=&out=&adults=… params from a search state. */
export function buildSearchQuery(state: SearchState): URLSearchParams {
  const qs = new URLSearchParams();
  if (state.where.trim()) qs.set("where", state.where.trim());

  // Flexible and exact dates are alternatives, not additions: emitting `in`/
  // `out` alongside `flexible=1` would hand the backend two different answers
  // to the same question.
  if (state.flexible.mode === "flexible") {
    buildFlexibleQuery(state.flexible, qs);
  } else {
    const ci = toParam(state.checkIn);
    const co = toParam(state.checkOut);
    if (ci) qs.set("in", ci);
    if (co) qs.set("out", co);
  }

  for (const key of ["adults", "children", "infants", "pets"] as const) {
    if (state.guests[key] > 0) qs.set(key, String(state.guests[key]));
  }
  return qs;
}

/** `/search?…` href for a search state (or bare `/search`). */
export function searchHref(state: SearchState): string {
  const qs = buildSearchQuery(state);
  return qs.size ? `/search?${qs.toString()}` : "/search";
}

/** Serializable initial query carried from the /search URL into a header. */
export type SeedSearch = {
  where?: string;
  checkIn?: string | null; // yyyy-mm-dd
  checkOut?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  /** Already-parsed flexible state, so the seed stays serializable. */
  flexible?: FlexibleSearch;
};

/**
 * Reads the flexible half of a `/search` URL.
 *
 * Separate from `seedSearchState` because the page has the raw params and the
 * seed takes a plain object — this is the one step that needs both.
 */
export function seedFlexibleFromParams(
  get: (k: string) => string | null,
): FlexibleSearch {
  return parseFlexibleQuery(get);
}

function parseISO(v?: string | null): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Seed a client search state from the URL-derived initial query. */
export function seedSearchState(init?: SeedSearch): SearchState {
  if (!init) return EMPTY_SEARCH;
  return {
    where: init.where ?? "",
    checkIn: parseISO(init.checkIn),
    checkOut: parseISO(init.checkOut),
    guests: {
      adults: init.adults ?? 0,
      children: init.children ?? 0,
      infants: init.infants ?? 0,
      pets: init.pets ?? 0,
    },
    flexible: init.flexible ?? EMPTY_FLEXIBLE,
  };
}
