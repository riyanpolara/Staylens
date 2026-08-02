import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  resolveRange,
  type RevenueDashboard,
  type RevenueQuery,
} from "@/lib/admin/revenue-query";

/**
 * Read side of the admin Revenue screen.
 *
 * One call. `admin_revenue_dashboard` (0023_revenue_dashboard.sql) returns every
 * KPI and all four chart series in a single JSON envelope, aggregated in
 * Postgres. Nothing is summed here: the browser receives ten numbers and four
 * short series, not a page of bookings to add up.
 *
 * Splitting this into a call per figure would let a KPI computed at 12:00:01 sit
 * next to a chart computed at 12:00:02 and disagree with it.
 */

export type FailureReason = "setup" | "forbidden" | "unavailable";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; reason: FailureReason; message: string };

type PgError = { message?: string; code?: string };

function failure(error: PgError): {
  ok: false;
  reason: FailureReason;
  message: string;
} {
  console.error("[admin/revenue] dashboard failed:", error);
  const message = error.message ?? "";

  if (error.code === "42883" || /could not find the function/i.test(message)) {
    return {
      ok: false,
      reason: "setup",
      message:
        "The revenue queries are not installed on this database. Apply supabase/migrations/0023_revenue_dashboard.sql, then reload.",
    };
  }
  if (error.code === "42501") {
    return {
      ok: false,
      reason: "forbidden",
      message: "This session is not allowed to read revenue figures.",
    };
  }
  return {
    ok: false,
    reason: "unavailable",
    message: message || "Could not reach the database.",
  };
}

/**
 * Trims or left-pads the prior series so it lines up index-for-index with the
 * current one. Padding with zeros rather than dropping points keeps the dashed
 * line spanning the full chart width instead of stopping short.
 */
function alignPrior(prior: number[], length: number): number[] {
  if (length === 0) return [];
  if (prior.length === length) return prior;
  if (prior.length > length) return prior.slice(prior.length - length);
  return [...Array(length - prior.length).fill(0), ...prior];
}

/** Numbers arrive from Postgres as strings (numeric); coerce once, at the edge. */
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function getRevenueDashboard(
  query: RevenueQuery,
): Promise<Result<RevenueDashboard>> {
  const supabase = await createClient();
  const { from, to, bucket } = resolveRange(query);

  const { data, error } = await supabase.rpc("admin_revenue_dashboard", {
    p_from: from,
    p_to: to,
    p_bucket: bucket,
  });

  if (error) return failure(error);
  if (!data) {
    return {
      ok: false,
      reason: "unavailable",
      message: "The revenue service returned nothing.",
    };
  }

  // `numeric` comes back as a string over the wire, so every money field is
  // normalised here rather than in each component that formats one.
  const d = data as unknown as RevenueDashboard;
  return {
    ok: true,
    data: {
      range: {
        from: d.range?.from ?? from,
        to: d.range?.to ?? to,
        bucket: d.range?.bucket ?? bucket,
        prior_from: d.range?.prior_from ?? "",
        prior_to: d.range?.prior_to ?? "",
        days: num(d.range?.days),
      },
      periods: {
        day: num(d.periods?.day),
        week: num(d.periods?.week),
        month: num(d.periods?.month),
        year: num(d.periods?.year),
      },
      totals: {
        gross: num(d.totals?.gross),
        commission: num(d.totals?.commission),
        taxes: num(d.totals?.taxes),
        payouts: num(d.totals?.payouts),
        net: num(d.totals?.net),
        refunds: num(d.totals?.refunds),
        refund_count: num(d.totals?.refund_count),
        bookings: num(d.totals?.bookings),
        commission_known: num(d.totals?.commission_known),
        avg_booking_value: num(d.totals?.avg_booking_value),
        median_booking_value: num(d.totals?.median_booking_value),
        avg_nights: num(d.totals?.avg_nights),
      },
      periods_prior: {
        day: num(d.periods_prior?.day),
        week: num(d.periods_prior?.week),
        month: num(d.periods_prior?.month),
        year: num(d.periods_prior?.year),
      },
      prior: {
        gross: num(d.prior?.gross),
        commission: num(d.prior?.commission),
        taxes: num(d.prior?.taxes),
        payouts: num(d.prior?.payouts),
        net: num(d.prior?.net),
        refunds: num(d.prior?.refunds),
        refund_count: num(d.prior?.refund_count),
        bookings: num(d.prior?.bookings),
        avg_booking_value: num(d.prior?.avg_booking_value),
      },
      // The prior window can bucket to a different count when the span does not
      // land on week/month boundaries. Align to the current series from the END,
      // so the most recent prior bucket sits under the most recent current one —
      // that is the comparison the dashed line is meant to make.
      trend_prior: alignPrior(
        (d.trend_prior ?? []).map(num),
        (d.trend ?? []).length,
      ),
      trend: (d.trend ?? []).map((p) => ({
        bucket: p.bucket,
        revenue: num(p.revenue),
        commission: num(p.commission),
        bookings: num(p.bookings),
      })),
      by_city: (d.by_city ?? []).map((c) => ({
        city: c.city,
        country: c.country,
        revenue: num(c.revenue),
        bookings: num(c.bookings),
        prior_revenue: num(c.prior_revenue),
      })),
      by_property_type: (d.by_property_type ?? []).map((t) => ({
        property_type: t.property_type,
        revenue: num(t.revenue),
        bookings: num(t.bookings),
      })),
      value_distribution: (d.value_distribution ?? []).map((b) => ({
        band: b.band,
        bookings: num(b.bookings),
        revenue: num(b.revenue),
      })),
    },
  };
}
