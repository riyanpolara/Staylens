import type { Property, PropertyStatus } from "@/lib/admin/types";

/**
 * URL ⇄ state for the admin Properties table.
 *
 * Deliberately free of `server-only` and of any Supabase import: the page
 * parses `searchParams` with it, the toolbar (client) and the sortable headers
 * (server) build hrefs with it, so every surface agrees on one shape and the
 * table's whole state stays shareable/bookmarkable in the URL.
 */

export const PROPERTY_PAGE_SIZE = 10;

export const PROPERTY_STATUSES = ["live", "pending", "suspended", "draft"] as const;

/** room_type_enum — the stable 4-value axis. `property_type` has 83 free-text
 *  values in the imported catalog, which is unusable as a filter. */
export const ROOM_TYPES = [
  "Entire home/apt",
  "Private room",
  "Shared room",
  "Hotel room",
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const PROPERTY_SORT_KEYS = [
  "title", "host", "location", "price", "rating", "reviews", "bookings", "status", "created_at",
] as const;
export type PropertySortKey = (typeof PROPERTY_SORT_KEYS)[number];

export type PropertyQuery = {
  q: string;
  status: PropertyStatus | "all";
  type: RoomType | "all";
  featured: "all" | "yes" | "no";
  sort: PropertySortKey;
  dir: "asc" | "desc";
  page: number;
};

export const DEFAULT_PROPERTY_QUERY: PropertyQuery = {
  q: "",
  status: "all",
  type: "all",
  featured: "all",
  sort: "created_at",
  dir: "desc",
  page: 1,
};

/** A row as `admin_properties_list` returns it. Same shape as the handoff
 *  spec's `Property`, except a listing can have lost its host to an ETL gap. */
export type AdminPropertyRow = Omit<Property, "host"> & {
  host: { id: string | null; name: string };
};

type SearchParamsInput = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? "";

const oneOf = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/** Anything unrecognised falls back to the default — a hand-edited URL can
 *  never push an unexpected value down to the RPC. */
export function parsePropertyQuery(searchParams: SearchParamsInput): PropertyQuery {
  const page = Number.parseInt(first(searchParams.page), 10);

  return {
    q: first(searchParams.q).trim().slice(0, 120),
    status: oneOf(first(searchParams.status), [...PROPERTY_STATUSES, "all"] as const, "all"),
    type: oneOf(first(searchParams.type), [...ROOM_TYPES, "all"] as const, "all"),
    featured: oneOf(first(searchParams.featured), ["all", "yes", "no"] as const, "all"),
    sort: oneOf(first(searchParams.sort), PROPERTY_SORT_KEYS, DEFAULT_PROPERTY_QUERY.sort),
    dir: oneOf(first(searchParams.dir), ["asc", "desc"] as const, DEFAULT_PROPERTY_QUERY.dir),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/** Serialise, omitting defaults so a pristine table has a clean `/admin/properties`. */
export function propertyQueryString(query: PropertyQuery): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULT_PROPERTY_QUERY) as (keyof PropertyQuery)[]) {
    const value = query[key];
    if (value !== DEFAULT_PROPERTY_QUERY[key]) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Href for the same table with `patch` applied. Any change other than paging
 *  resets to page 1 — page 7 of the old result set is meaningless. */
export function propertyHref(query: PropertyQuery, patch: Partial<PropertyQuery>): string {
  const next: PropertyQuery = { ...query, ...patch };
  if (patch.page === undefined) next.page = 1;
  return `/admin/properties${propertyQueryString(next)}`;
}

/** Drives the empty state's "Clear filters" affordance. */
export function isPropertyQueryFiltered(query: PropertyQuery): boolean {
  return (
    query.q !== "" ||
    query.status !== "all" ||
    query.type !== "all" ||
    query.featured !== "all"
  );
}

/** Clicking a column header sorts by it; clicking the active one flips direction. */
export function nextSortFor(
  query: PropertyQuery,
  key: PropertySortKey,
): { sort: PropertySortKey; dir: "asc" | "desc" } {
  if (query.sort !== key) {
    // Text reads best A→Z; numbers and dates read best biggest-first.
    const ascFirst: PropertySortKey[] = ["title", "host", "location", "status"];
    return { sort: key, dir: ascFirst.includes(key) ? "asc" : "desc" };
  }
  return { sort: key, dir: query.dir === "asc" ? "desc" : "asc" };
}
