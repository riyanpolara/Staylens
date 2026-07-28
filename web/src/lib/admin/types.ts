/**
 * Shared admin domain types, from the Claude Design handoff spec
 * (staylens-admin-dashboard/project/handoff-spec.md).
 *
 * Scope note: each feature module (users, properties, bookings) owns the row
 * shapes its own RPC returns — those live next to their queries in
 * `lib/admin/<module>*.ts`. This file only holds what is genuinely shared, so
 * the same union is never declared in two places. Types that were duplicated
 * here and in a feature module (BookingStatus, PaymentStatus, UserRole,
 * UserStatus) have been dropped in favour of the module-local definitions that
 * the screens actually import.
 */

export type PropertyStatus = "live" | "pending" | "suspended" | "draft";

/** Host summary as embedded in a Property row. */
export interface Host {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_verified: boolean;
  property_count: number;
  revenue_total: number;
  booking_count: number;
  rating_avg: number | null;
  response_rate: number;
  status: "active" | "pending" | "suspended" | "banned";
  joined_at: string;
}

/** Canonical listing shape; `AdminPropertyRow` in property-query.ts derives from it. */
export interface Property {
  id: string;
  title: string;
  type: string;
  host: Pick<Host, "id" | "name">;
  city: string;
  country: string;
  price_per_night: number;
  currency: string;
  status: PropertyStatus;
  is_featured: boolean;
  rating_avg: number | null;
  review_count: number;
  booking_count: number;
  cover_image_url: string | null;
  created_at: string;
}

/** Used by the AI Search screen's placeholder dataset. */
export interface AiSearchEvent {
  id: string;
  user_id: string | null;
  prompt: string;
  result_count: number;
  clicked_property_id: string | null;
  booked: boolean;
  latency_ms: number;
  embedding_tokens: number;
  created_at: string;
}

export interface StatSeriesPoint {
  label: string;
  value: number;
  compare?: number;
}

/**
 * Status → design-system tag class (handoff spec "Status → tag mapping").
 * Takes a plain string so every module's own status union can call it.
 */
export function tagClassFor(status: string): string {
  const s = status.toLowerCase();
  if (["live", "active", "confirmed", "paid", "completed"].includes(s)) return "tag-accent-2";
  if (["pending"].includes(s)) return "tag-accent";
  return "tag-neutral"; // suspended · cancelled · banned · refunded · draft · failed
}
