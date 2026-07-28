import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BookingQuery, BookingStatus, PaymentStatus } from "@/lib/admin/bookings-query";
import { formatInr, formatPrice } from "@/lib/currency";

/**
 * Bookings data access for /admin/bookings.
 *
 * Search, filtering, sorting, paging and the header metrics all resolve in a
 * single `admin_bookings_list()` call (migration 0017). That matters: the list
 * joins bookings → profiles → properties → hosts, and `properties` alone is
 * ~6.5k rows — paging client-side would mean downloading the join just to
 * count it. The RPC also enforces the admin check itself, so this layer only
 * has to shape the result and classify failures.
 *
 * The URL contract (vocabulary, parsing, link building) lives in
 * `./bookings-query`, which the Client Components share; it is re-exported
 * here so server code has one import.
 */

export * from "@/lib/admin/bookings-query";

/* ── Result shapes ────────────────────────────────────────────────────── */

export type BookingRow = {
  id: string;
  reference: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  total_price: number | null;
  currency: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  created_at: string;
  guest: { id: string; name: string | null; email: string | null; avatar_url: string | null };
  property: { id: string; title: string; city: string | null; country: string | null };
  host: { id: string | null; name: string | null };
};

export type BookingMetrics = {
  bookings_today: number;
  checkins_week: number;
  /** null when there are no bookings at all — a rate over zero is undefined. */
  cancellation_rate: number | null;
  avg_booking_value: number | null;
  total_bookings: number;
  pending_payments: number;
};

export type BookingList = {
  rows: BookingRow[];
  total: number;
  page: number;
  page_size: number;
  page_count: number;
  metrics: BookingMetrics;
};

export type BookingDetail = {
  id: string;
  reference: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  nightly_price: number | null;
  cleaning_fee: number | null;
  total_price: number | null;
  commission: number | null;
  currency: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by_name: string | null;
  created_at: string;
  updated_at: string;
  guest: {
    id: string;
    name: string | null;
    email: string | null;
    username: string | null;
    avatar_url: string | null;
    member_since: string | null;
    booking_count: number;
    total_spend: number;
  };
  property: {
    id: string;
    title: string;
    city: string | null;
    country: string | null;
    property_type: string | null;
    room_type: string | null;
    accommodates: number | null;
    bedrooms: number | null;
    beds: number | null;
    bathrooms: number | null;
    price: number | null;
    currency: string | null;
    cleaning_fee: number | null;
    minimum_nights: number | null;
    cancellation_policy: string | null;
    listing_url: string | null;
    is_active: boolean;
    rating: number | null;
    review_count: number | null;
    image_url: string | null;
  } | null;
  host: {
    id: string;
    name: string | null;
    location: string | null;
    picture_url: string | null;
    is_superhost: boolean;
    identity_verified: boolean;
    response_rate: number | null;
    response_time: string | null;
    listings_count: number | null;
  } | null;
};

/** Why a read failed, so the screen can say something actionable. */
export type FailureReason = "setup" | "forbidden" | "unavailable";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; reason: FailureReason; message: string };

/* ── Reads ────────────────────────────────────────────────────────────── */

const MIGRATION = "supabase/migrations/0017_bookings_admin.sql";

type RpcError = { code?: string; message?: string; hint?: string };

/**
 * Maps a PostgREST/Postgres error onto a state the UI can explain.
 * A missing function means the migration hasn't been applied — by far the most
 * likely failure on a fresh checkout, and the one worth naming precisely.
 */
function classify(error: RpcError): Result<never> {
  const msg = `${error.message ?? ""} ${error.hint ?? ""}`.toLowerCase();
  if (
    error.code === "PGRST202" ||
    msg.includes("could not find the function") ||
    msg.includes("does not exist")
  ) {
    return {
      ok: false,
      reason: "setup",
      message: `The booking queries aren't installed yet. Apply ${MIGRATION}, then reload.`,
    };
  }
  if (error.code === "42501" || msg.includes("forbidden")) {
    return {
      ok: false,
      reason: "forbidden",
      message: "Your account doesn't have permission to read bookings.",
    };
  }
  return { ok: false, reason: "unavailable", message: error.message ?? "Query failed." };
}

export async function getBookings(q: BookingQuery): Promise<Result<BookingList>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_bookings_list", {
      // Unset bounds are omitted rather than passed as null, so the function's
      // own defaults apply and the generated arg types stay satisfied.
      ...(q.search ? { p_search: q.search } : {}),
      ...(q.from ? { p_from: q.from } : {}),
      ...(q.to ? { p_to: q.to } : {}),
      p_status: q.status,
      p_payment: q.payment,
      p_sort: q.sort,
      p_dir: q.dir,
      p_page: q.page,
      p_page_size: q.pageSize,
    });

    if (error) return classify(error);
    if (!data) return { ok: false, reason: "unavailable", message: "No data returned." };

    // The RPC is typed `Returns: Json`; the shape is this module's contract
    // with migration 0017.
    const d = data as unknown as BookingList;
    return { ok: true, data: { ...d, rows: d.rows ?? [] } };
  } catch (err) {
    console.error("[admin/bookings] list failed:", err);
    return { ok: false, reason: "unavailable", message: "Couldn't reach the database." };
  }
}

/**
 * One booking with its guest, property and host context.
 * A valid-but-unknown id resolves to `data: null` rather than an error — the
 * panel renders "not found" for a stale link.
 */
export async function getBookingDetail(id: string): Promise<Result<BookingDetail | null>> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: true, data: null };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_booking_detail", { p_id: id });
    if (error) return classify(error);
    return { ok: true, data: (data as unknown as BookingDetail | null) ?? null };
  } catch (err) {
    console.error("[admin/bookings] detail failed:", err);
    return { ok: false, reason: "unavailable", message: "Couldn't reach the database." };
  }
}

/* ── Formatting ───────────────────────────────────────────────────────────
 * Applied on the server and passed down as strings. Locale formatting done in
 * a Client Component would render differently on the server and the browser.
 * `en-GB`/`en-US` are pinned for the same reason — the admin is an internal
 * tool with one presentation, not a localised surface.
 * ---------------------------------------------------------------------- */

export function formatMoney(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined) return "—";
  // Booking totals are stored in USD (or another source currency). The app
  // displays INR everywhere, so convert USD rows and pass anything already in
  // the display currency straight through.
  return (currency || "USD").trim().toUpperCase() === "USD"
    ? formatPrice(value)
    : formatInr(value);
}

/** `2026-08-14` → `14 Aug 2026`. Dates are plain, timezone-free strings. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Short form for tight table cells: `14 Aug`. */
export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

/** Initials for the guest avatar fallback. */
export function initialsOf(name: string | null, email: string | null): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}
