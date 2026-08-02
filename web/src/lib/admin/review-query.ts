/**
 * The reviews screen's URL contract — vocabulary, parsing and link building.
 *
 * Deliberately free of server imports: the toolbar is a Client Component and
 * builds the same links the server-rendered sort headers and pager do, so both
 * sides agree on what a "current view" means. Data access lives in `./reviews`,
 * which is server-only.
 *
 * The URL is the single source of truth, including which review's detail panel
 * is open (`?review=<id>`). That keeps the page a plain Server Component and
 * makes every view — filters, page, open review — shareable and
 * back-button-correct.
 *
 * Mirrors `user-query.ts` exactly, so the two moderation screens behave the same
 * way and share the same components.
 */

/* ── Vocabulary (mirrors review_status_enum in 0022_reviews_admin.sql) ── */

export const REVIEW_STATUSES = ["published", "pending", "rejected", "deleted"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  published: "Published",
  pending: "Pending",
  rejected: "Rejected",
  deleted: "Deleted",
};

/**
 * The verbs the row menu offers, and the status each resolves to.
 *
 * "Restore" is not a state — it is what an admin calls putting a rejected or
 * deleted review back, and `admin_review_set_status` maps it to `published`.
 */
export const REVIEW_ACTIONS = ["approve", "reject", "restore", "delete"] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export const ACTION_LABEL: Record<ReviewAction, string> = {
  approve: "Approve",
  reject: "Reject",
  restore: "Restore",
  delete: "Delete",
};

/**
 * Which actions make sense for a review in a given state. Offering "Approve" on
 * an already-published review is noise, and offering "Restore" on one that was
 * never taken down is meaningless.
 */
export function actionsFor(status: string): ReviewAction[] {
  switch (status) {
    case "published":
      return ["reject", "delete"];
    case "pending":
      return ["approve", "reject", "delete"];
    case "rejected":
      return ["restore", "delete"];
    case "deleted":
      return ["restore"];
    default:
      return ["approve", "reject", "delete"];
  }
}

/** `data_source_enum` values that actually appear on reviews. */
export const REVIEW_SOURCES = ["mongodb_airbnb", "inside_airbnb", "staylens"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

/**
 * Sortable columns. The value is what `admin_reviews_list(p_sort)` understands;
 * anything else falls back to `review_date` inside the function, so a
 * hand-edited URL cannot break the query.
 */
export const SORT_KEYS = [
  "review_date",
  "created_at",
  "rating",
  "reviewer_name",
  "property_name",
  "host_name",
  "status",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/* ── Query state ─────────────────────────────────────────────────────── */

export type ReviewQuery = {
  search: string;
  status: ReviewStatus | "all";
  /** 1–5, or null for any. */
  rating: number | null;
  source: ReviewSource | "all";
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
};

export type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/**
 * Reads state out of the URL. Every value is validated against a known set here
 * rather than trusted downstream, so a hand-edited query string degrades to the
 * default view instead of erroring.
 */
export function parseReviewQuery(sp: SearchParams): ReviewQuery {
  const status = one(sp.status).toLowerCase();
  const source = one(sp.source).toLowerCase();
  const sort = one(sp.sort).toLowerCase();
  const dir = one(sp.dir).toLowerCase();
  const rating = Number.parseInt(one(sp.rating), 10);
  const page = Number.parseInt(one(sp.page), 10);
  const size = Number.parseInt(one(sp.size), 10);

  return {
    search: one(sp.q).slice(0, 120),
    status: (REVIEW_STATUSES as readonly string[]).includes(status)
      ? (status as ReviewStatus)
      : "all",
    rating: Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null,
    source: (REVIEW_SOURCES as readonly string[]).includes(source)
      ? (source as ReviewSource)
      : "all",
    sort: (SORT_KEYS as readonly string[]).includes(sort)
      ? (sort as SortKey)
      : "review_date",
    dir: dir === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
    pageSize: (PAGE_SIZE_OPTIONS as readonly number[]).includes(size)
      ? size
      : DEFAULT_PAGE_SIZE,
  };
}

/** The `?review=<id>` that opens the detail panel, if present. */
export function parseOpenReviewId(sp: SearchParams): string | null {
  return one(sp.review) || null;
}

export type HrefOverrides = Partial<ReviewQuery> & { review?: string | null };

/**
 * Builds a reviews URL from the current query plus overrides.
 *
 * Defaults are omitted so the common view has a clean address, and `page` resets
 * to 1 whenever a filter changes — otherwise narrowing the results while on
 * page 4 lands the admin on an empty screen.
 */
export function reviewsHref(q: ReviewQuery, overrides: HrefOverrides = {}): string {
  const next = { ...q, ...overrides };

  const changedFilter =
    overrides.search !== undefined ||
    overrides.status !== undefined ||
    overrides.rating !== undefined ||
    overrides.source !== undefined ||
    overrides.pageSize !== undefined ||
    overrides.sort !== undefined ||
    overrides.dir !== undefined;
  if (changedFilter && overrides.page === undefined) next.page = 1;

  const p = new URLSearchParams();
  if (next.search) p.set("q", next.search);
  if (next.status !== "all") p.set("status", next.status);
  if (next.rating !== null) p.set("rating", String(next.rating));
  if (next.source !== "all") p.set("source", next.source);
  if (next.sort !== "review_date") p.set("sort", next.sort);
  if (next.dir !== "desc") p.set("dir", next.dir);
  if (next.page > 1) p.set("page", String(next.page));
  if (next.pageSize !== DEFAULT_PAGE_SIZE) p.set("size", String(next.pageSize));
  if (overrides.review) p.set("review", overrides.review);

  const qs = p.toString();
  return qs ? `/admin/reviews?${qs}` : "/admin/reviews";
}

/**
 * Toggling a sortable column: the same key flips direction, a new key starts in
 * the direction that is useful first (A→Z for text, newest/highest otherwise).
 */
export function sortHref(q: ReviewQuery, key: SortKey): string {
  if (q.sort === key) {
    return reviewsHref(q, { sort: key, dir: q.dir === "asc" ? "desc" : "asc" });
  }
  const textual =
    key === "reviewer_name" ||
    key === "property_name" ||
    key === "host_name" ||
    key === "status";
  return reviewsHref(q, { sort: key, dir: textual ? "asc" : "desc" });
}

/** True when anything is narrowing the list (drives the "Clear filters" action). */
export function hasActiveFilters(q: ReviewQuery): boolean {
  return Boolean(
    q.search || q.status !== "all" || q.rating !== null || q.source !== "all",
  );
}

/* ── Row shape ───────────────────────────────────────────────────────── */

/** A row as `admin_reviews_list` returns it. */
export type AdminReviewRow = {
  id: string;
  status: string;
  rating: number | null;
  /** First 240 characters of the comment; the detail call returns it whole. */
  excerpt: string;
  review_date: string | null;
  created_at: string;
  source: string;
  reviewer_name: string;
  reviewer_id: string | null;
  reviewer_avatar_url: string | null;
  reviewer_is_member: boolean;
  property_id: string | null;
  property_name: string | null;
  property_city: string | null;
  property_country: string | null;
  host_id: string | null;
  host_name: string | null;
};

/** `admin_review_detail`'s payload. */
export type AdminReviewDetail = {
  id: string;
  status: string;
  rating: number | null;
  comments: string | null;
  review_date: string | null;
  created_at: string;
  source: string;
  moderation_note: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  reviewer: {
    id: string | null;
    name: string;
    email: string | null;
    avatar_url: string | null;
    is_member: boolean;
  };
  property: {
    id: string | null;
    name: string | null;
    city: string | null;
    country: string | null;
  };
  host: {
    id: string | null;
    name: string | null;
    is_superhost: boolean | null;
  };
};

export type ReviewStatusCounts = {
  all: number;
  published: number;
  pending: number;
  rejected: number;
  deleted: number;
};
