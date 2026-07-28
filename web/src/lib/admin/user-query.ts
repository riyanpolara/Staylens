/**
 * The users screen's URL contract — vocabulary, parsing and link building.
 *
 * Deliberately free of server imports: the toolbar is a Client Component and
 * builds the same links the server-rendered sort headers and pager do, so both
 * sides agree on what a "current view" means. Data access lives in `./users`,
 * which is server-only.
 *
 * The URL is the single source of truth, including which user's detail modal is
 * open (`?user=<id>`). That keeps the page a plain Server Component and makes
 * every view — filters, page, open profile — shareable and back-button-correct.
 */

/* ── Vocabulary (mirrors the database) ────────────────────────────────── */

/**
 * The roles `profiles_role_check` permits.
 *
 * The design handoff calls the default role "guest", but the column has stored
 * `user` since 0011_auth_profiles — so `user` is the value and "Guest" is only
 * its label. Renaming the stored value would break every existing row and the
 * sign-up trigger.
 */
export const USER_ROLES = ["user", "host", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABEL: Record<UserRole, string> = {
  user: "Guest",
  host: "Host",
  admin: "Admin",
};

/** `profiles_status_check`. */
export const USER_STATUSES = ["active", "pending", "suspended", "banned"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * Statuses an admin can assign from the row menu. `pending` is absent on
 * purpose — it means "has not confirmed their email", which is a fact about the
 * account rather than a moderation decision.
 */
export const ASSIGNABLE_STATUSES = ["active", "suspended", "banned"] as const;

/**
 * Sortable columns. The value is what `admin_users_list(p_sort)` understands;
 * anything else falls back to `created_at` inside the function, so a
 * hand-edited URL cannot break the query.
 */
export const SORT_KEYS = [
  "name",
  "country",
  "role",
  "status",
  "created_at",
  "last_sign_in_at",
  "booking_count",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/* ── Query state ─────────────────────────────────────────────────────── */

export type UserQuery = {
  search: string;
  role: UserRole | "all";
  status: UserStatus | "all";
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
export function parseUserQuery(sp: SearchParams): UserQuery {
  const role = one(sp.role).toLowerCase();
  const status = one(sp.status).toLowerCase();
  const sort = one(sp.sort).toLowerCase();
  const dir = one(sp.dir).toLowerCase();
  const page = Number.parseInt(one(sp.page), 10);
  const size = Number.parseInt(one(sp.size), 10);

  return {
    search: one(sp.q).slice(0, 120),
    role: (USER_ROLES as readonly string[]).includes(role) ? (role as UserRole) : "all",
    status: (USER_STATUSES as readonly string[]).includes(status)
      ? (status as UserStatus)
      : "all",
    sort: (SORT_KEYS as readonly string[]).includes(sort) ? (sort as SortKey) : "created_at",
    dir: dir === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
    pageSize: (PAGE_SIZE_OPTIONS as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
  };
}

/** The `?user=<id>` that opens the details modal, if present. */
export function parseOpenUserId(sp: SearchParams): string | null {
  return one(sp.user) || null;
}

export type HrefOverrides = Partial<UserQuery> & { user?: string | null };

/**
 * Builds a users URL from the current query plus overrides.
 *
 * Defaults are omitted so the common view has a clean address, and `page`
 * resets to 1 whenever a filter changes — otherwise narrowing the results while
 * on page 4 lands the admin on an empty screen.
 *
 * `user` (the open modal) is not carried over: it is set explicitly when
 * opening a row and dropped by every other navigation.
 */
export function usersHref(q: UserQuery, overrides: HrefOverrides = {}): string {
  const next = { ...q, ...overrides };

  const changedFilter =
    overrides.search !== undefined ||
    overrides.role !== undefined ||
    overrides.status !== undefined ||
    overrides.pageSize !== undefined ||
    overrides.sort !== undefined ||
    overrides.dir !== undefined;
  if (changedFilter && overrides.page === undefined) next.page = 1;

  const p = new URLSearchParams();
  if (next.search) p.set("q", next.search);
  if (next.role !== "all") p.set("role", next.role);
  if (next.status !== "all") p.set("status", next.status);
  if (next.sort !== "created_at") p.set("sort", next.sort);
  if (next.dir !== "desc") p.set("dir", next.dir);
  if (next.page > 1) p.set("page", String(next.page));
  if (next.pageSize !== DEFAULT_PAGE_SIZE) p.set("size", String(next.pageSize));
  if (overrides.user) p.set("user", overrides.user);

  const qs = p.toString();
  return qs ? `/admin/users?${qs}` : "/admin/users";
}

/**
 * Toggling a sortable column: the same key flips direction, a new key starts in
 * the direction that is useful first (A→Z for text, newest/largest otherwise).
 */
export function sortHref(q: UserQuery, key: SortKey): string {
  if (q.sort === key) {
    return usersHref(q, { sort: key, dir: q.dir === "asc" ? "desc" : "asc" });
  }
  const textual = key === "name" || key === "country" || key === "role" || key === "status";
  return usersHref(q, { sort: key, dir: textual ? "asc" : "desc" });
}

/** True when anything is narrowing the list (drives the "Clear filters" action). */
export function hasActiveFilters(q: UserQuery): boolean {
  return Boolean(q.search || q.role !== "all" || q.status !== "all");
}

/* ── Row shape ───────────────────────────────────────────────────────── */

/** A row as `admin_users_list` returns it. */
export type AdminUserRow = {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  country: string | null;
  role: string;
  status: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_verified: boolean;
  booking_count: number;
};

export type AdminUserBooking = {
  id: string;
  reference: string | null;
  property: string | null;
  check_in: string | null;
  check_out: string | null;
  nights: number | null;
  total_price: number | null;
  currency: string | null;
  status: string;
  created_at: string;
};

/** `admin_user_detail`'s payload. */
export type AdminUserDetail = AdminUserRow & {
  banned_until: string | null;
  username: string | null;
  bio: string | null;
  birthday: string | null;
  home_currency: string | null;
  updated_at: string;
  bookings_upcoming: number;
  bookings_cancelled: number;
  total_spend: number;
  favorites_count: number;
  saved_count: number;
  recent_bookings: AdminUserBooking[];
};

/* ── Presentation helpers ────────────────────────────────────────────── */

/** Role tint, per the handoff's Users screen. */
export function roleTagClass(role: string): string {
  if (role === "admin") return "tag-accent";
  if (role === "host") return "tag-accent-2";
  return "tag-neutral";
}

export function roleLabel(role: string): string {
  return ROLE_LABEL[role as UserRole] ?? role;
}

/** Fixed UTC so the server and the client never render different strings. */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Date + time in UTC, for the detail modal's "last seen".
 *
 * Absolute rather than relative ("3d ago") throughout: a relative label would
 * mean calling `Date.now()` during render, which is impure — the same markup
 * would describe a different moment on the server and after hydration. The
 * column is also sortable, and a sorted column reads better as real dates.
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(d);
}

export function formatMoney(amount: number | null | undefined, currency = "USD"): string {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(n) ? n : 0);
  } catch {
    // A bad ISO code in imported data must not blank out the cell.
    return `${currency} ${Math.round(Number.isFinite(n) ? n : 0).toLocaleString()}`;
  }
}

/** Avatar fallback. */
export function initialsOf(name: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
