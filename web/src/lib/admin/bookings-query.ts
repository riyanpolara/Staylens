/**
 * The bookings screen's URL contract — vocabulary, parsing and link building.
 *
 * Deliberately free of server imports: the filter bar is a Client Component
 * and builds the same links the server-rendered pager does, so both sides
 * agree on what a "current view" means. Data access lives in `./bookings`,
 * which is server-only and re-exports everything here.
 *
 * The URL is the single source of truth for filter state. That keeps the page
 * a plain Server Component (no client fetching), and makes any view someone is
 * looking at shareable and back-button-correct.
 */

/* ── Vocabulary (mirrors the database enums) ──────────────────────────── */

/** `booking_status_enum`. Note `declined`, which the design spec omits. */
export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "declined",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** `payment_status_enum`. */
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Statuses an admin may assign directly. `cancelled` is absent on purpose —
 * cancelling requires a reason, so it goes through `admin_booking_cancel`.
 */
export const ASSIGNABLE_STATUSES = ["pending", "confirmed", "completed", "declined"] as const;

export const SORT_KEYS = [
  "created_at",
  "check_in",
  "check_out",
  "nights",
  "total_price",
  "reference",
  "guest",
  "property",
  "status",
  "payment",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/* ── Query state ──────────────────────────────────────────────────────── */

export type BookingQuery = {
  search: string;
  status: BookingStatus | "all";
  payment: PaymentStatus | "all";
  from: string | null;
  to: string | null;
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
};

export type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** Accepts only YYYY-MM-DD; anything else is treated as "no bound". */
function isoDate(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return Number.isNaN(Date.parse(v)) ? null : v;
}

/**
 * Reads filter state out of the URL. Every value is validated against a known
 * set here rather than trusted downstream, so a hand-edited query string
 * degrades to the default view instead of erroring.
 */
export function parseBookingQuery(sp: SearchParams): BookingQuery {
  const status = one(sp.status).toLowerCase();
  const payment = one(sp.payment).toLowerCase();
  const sort = one(sp.sort).toLowerCase();
  const dir = one(sp.dir).toLowerCase();
  const page = Number.parseInt(one(sp.page), 10);
  const size = Number.parseInt(one(sp.size), 10);

  return {
    search: one(sp.q).slice(0, 120),
    status: (BOOKING_STATUSES as readonly string[]).includes(status)
      ? (status as BookingStatus)
      : "all",
    payment: (PAYMENT_STATUSES as readonly string[]).includes(payment)
      ? (payment as PaymentStatus)
      : "all",
    from: isoDate(one(sp.from)),
    to: isoDate(one(sp.to)),
    sort: (SORT_KEYS as readonly string[]).includes(sort) ? (sort as SortKey) : "created_at",
    dir: dir === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: (PAGE_SIZE_OPTIONS as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
  };
}

export type HrefOverrides = Partial<BookingQuery> & { booking?: string | null };

/**
 * Builds a bookings URL from the current query plus overrides.
 *
 * Defaults are omitted so the common view has a clean address, and `page`
 * resets to 1 whenever a filter changes — otherwise narrowing the results
 * while on page 4 lands the operator on an empty screen.
 *
 * `booking` (the open detail panel) is intentionally NOT carried over: it is
 * set explicitly when opening a row and dropped by every other navigation.
 */
export function bookingsHref(q: BookingQuery, overrides: HrefOverrides = {}): string {
  const next = { ...q, ...overrides };
  const changedFilter =
    overrides.search !== undefined ||
    overrides.status !== undefined ||
    overrides.payment !== undefined ||
    overrides.from !== undefined ||
    overrides.to !== undefined ||
    overrides.pageSize !== undefined ||
    overrides.sort !== undefined ||
    overrides.dir !== undefined;
  if (changedFilter && overrides.page === undefined) next.page = 1;

  const p = new URLSearchParams();
  if (next.search) p.set("q", next.search);
  if (next.status !== "all") p.set("status", next.status);
  if (next.payment !== "all") p.set("payment", next.payment);
  if (next.from) p.set("from", next.from);
  if (next.to) p.set("to", next.to);
  if (next.sort !== "created_at") p.set("sort", next.sort);
  if (next.dir !== "desc") p.set("dir", next.dir);
  if (next.page > 1) p.set("page", String(next.page));
  if (next.pageSize !== DEFAULT_PAGE_SIZE) p.set("size", String(next.pageSize));
  if (overrides.booking) p.set("booking", overrides.booking);

  const qs = p.toString();
  return qs ? `/admin/bookings?${qs}` : "/admin/bookings";
}

/**
 * Toggling a sortable column: same key flips direction, a new key starts in
 * the direction that is useful first (newest / largest / A→Z).
 */
export function sortHref(q: BookingQuery, key: SortKey): string {
  if (q.sort === key) return bookingsHref(q, { sort: key, dir: q.dir === "asc" ? "desc" : "asc" });
  const textual = key === "reference" || key === "guest" || key === "property";
  return bookingsHref(q, { sort: key, dir: textual ? "asc" : "desc" });
}

/** True when anything is narrowing the list (drives the "Clear" affordance). */
export function hasActiveFilters(q: BookingQuery): boolean {
  return Boolean(q.search || q.status !== "all" || q.payment !== "all" || q.from || q.to);
}
