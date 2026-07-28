import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCompact } from "@/lib/currency";

/**
 * Dashboard-home data access.
 *
 * Everything comes from a single `admin_dashboard_home()` RPC so the screen
 * costs one database round trip instead of a dozen counts. The RPC aggregates
 * server-side (properties ~6.5k rows, reviews ~43k) and enforces the admin
 * check itself, so this layer only has to shape and classify failures.
 */

export type DashboardKpis = {
  total_users: number;
  /** properties with status = 'live' (0015 made `status` canonical). */
  total_properties: number;
  /** awaiting moderation — available since 0015_property_moderation. */
  pending_properties?: number;
  total_bookings: number;
  total_revenue: number;
  avg_rating: number | null;
  total_reviews: number;
  active_hosts: number;
  /** null = not derivable from the current schema (no moderation column). */
  pending_reviews: number | null;
  /** null = no ai_search_events table yet. */
  ai_searches: number | null;
};

export type RevenuePoint = { label: string; value: number };
export type BookingsPoint = { label: string; confirmed: number; cancelled: number };
export type MixSlice = { label: string; value: number };
export type ActivityItem = { title: string; meta: string; kind: string; at: string };

export type DashboardData = {
  kpis: DashboardKpis;
  revenue_series: RevenuePoint[];
  bookings_series: BookingsPoint[];
  property_mix: MixSlice[];
  recent_activity: ActivityItem[];
};

export type DashboardResult =
  | { ok: true; data: DashboardData }
  | { ok: false; reason: "setup" | "forbidden" | "unavailable"; message: string };

/**
 * Loads the dashboard aggregate.
 *
 * Failure is classified rather than thrown so the page can render a specific,
 * actionable state instead of a generic error:
 *   setup       — migration 0013/0016 not applied yet
 *   forbidden   — signed in but not an admin (belt-and-braces; layout gates too)
 *   unavailable — network/database problem
 */
export async function getDashboardData(months = 12): Promise<DashboardResult> {
  try {
    const supabase = await createClient();
    // The RPC isn't in the generated types until they're regenerated post-migration.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("admin_dashboard_home", {
      months,
    });

    if (error) {
      const msg = `${error.message ?? ""} ${error.hint ?? ""}`.toLowerCase();
      // PostgREST reports an unknown function as PGRST202 / 404.
      if (
        error.code === "PGRST202" ||
        msg.includes("could not find the function") ||
        msg.includes("does not exist")
      ) {
        return {
          ok: false,
          reason: "setup",
          message:
            "The dashboard aggregate isn't installed yet. Apply supabase/migrations/0013_admin_rls.sql and 0016_admin_dashboard.sql, then reload.",
        };
      }
      if (error.code === "42501" || msg.includes("forbidden")) {
        return {
          ok: false,
          reason: "forbidden",
          message: "Your account doesn't have permission to read these metrics.",
        };
      }
      return { ok: false, reason: "unavailable", message: error.message ?? "Query failed." };
    }

    if (!data) {
      return { ok: false, reason: "unavailable", message: "No data returned." };
    }

    const d = data as DashboardData;
    return {
      ok: true,
      data: {
        kpis: d.kpis,
        revenue_series: d.revenue_series ?? [],
        bookings_series: d.bookings_series ?? [],
        property_mix: d.property_mix ?? [],
        recent_activity: d.recent_activity ?? [],
      },
    };
  } catch (err) {
    console.error("[admin/dashboard] load failed:", err);
    return {
      ok: false,
      reason: "unavailable",
      message: "Couldn't reach the database.",
    };
  }
}

/* ── formatting helpers (shared by the cards) ─────────────────────────── */

export function formatCurrency(usd: number): string {
  // Revenue is stored in USD; the whole app displays INR, so the admin uses the
  // same conversion + Indian units (K / L / Cr) as the public site.
  return formatPriceCompact(usd);
}

export function formatCount(n: number): string {
  return n.toLocaleString();
}
