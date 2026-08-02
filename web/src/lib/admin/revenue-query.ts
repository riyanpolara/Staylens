/**
 * The revenue screen's URL contract.
 *
 * Deliberately free of server imports: the range picker is a Client Component
 * and builds the same links the server-rendered page reads, so both sides agree
 * on what a "current view" means. Data access lives in `./revenue`, which is
 * server-only.
 *
 * Mirrors `user-query.ts` / `review-query.ts`: everything is validated against a
 * known set here, so a hand-edited query string degrades to the default view
 * instead of erroring.
 */

/** Trend granularity. The value is what `admin_revenue_dashboard(p_bucket)`
 *  understands; anything else falls back to `day` inside the function. */
export const BUCKETS = ["day", "week", "month", "year"] as const;
export type Bucket = (typeof BUCKETS)[number];

export const BUCKET_LABEL: Record<Bucket, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

/**
 * Preset windows, with the bucket that reads well at that span — 365 daily
 * points is unreadable, and 7 monthly ones say nothing.
 */
/**
 * The design drives the whole screen from one Daily/Weekly/Monthly/Yearly
 * control, so a grain implies its own window — "Weekly" means the last 12 weeks
 * bucketed weekly. `note` is the caption shown beside the tabs, and `short` is
 * the ledger's current-period column header.
 */
export const RANGES = [
  { key: "daily", label: "Daily", days: 30, bucket: "day", note: "Last 30 days", short: "Today" },
  { key: "weekly", label: "Weekly", days: 84, bucket: "week", note: "Last 12 weeks", short: "This week" },
  { key: "monthly", label: "Monthly", days: 365, bucket: "month", note: "Last 12 months", short: "This month" },
  { key: "yearly", label: "Yearly", days: 1095, bucket: "year", note: "Last 3 years", short: "This year" },
] as const;

export type RangeKey = (typeof RANGES)[number]["key"];
export const DEFAULT_RANGE: RangeKey = "weekly";

export type RevenueQuery = {
  range: RangeKey;
  /** Explicit override; otherwise the range's natural bucket. */
  bucket: Bucket | null;
};

export type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export function parseRevenueQuery(sp: SearchParams): RevenueQuery {
  const range = one(sp.range).toLowerCase();
  const bucket = one(sp.bucket).toLowerCase();
  return {
    range: (RANGES as readonly { key: string }[]).some((r) => r.key === range)
      ? (range as RangeKey)
      : DEFAULT_RANGE,
    bucket: (BUCKETS as readonly string[]).includes(bucket) ? (bucket as Bucket) : null,
  };
}

/** The window the RPC should aggregate over, resolved from the preset. */
export function resolveRange(q: RevenueQuery): {
  from: string;
  to: string;
  bucket: Bucket;
  days: number;
} {
  const preset = RANGES.find((r) => r.key === q.range) ?? RANGES[1];
  const to = new Date();
  const from = new Date(to);
  // days - 1: "last 7 days" includes today, so it spans 6 days back.
  from.setDate(from.getDate() - (preset.days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    from: iso(from),
    to: iso(to),
    bucket: q.bucket ?? (preset.bucket as Bucket),
    days: preset.days,
  };
}

export function revenueHref(
  q: RevenueQuery,
  overrides: Partial<RevenueQuery> = {},
): string {
  const next = { ...q, ...overrides };
  const p = new URLSearchParams();
  if (next.range !== DEFAULT_RANGE) p.set("range", next.range);
  if (next.bucket) p.set("bucket", next.bucket);
  const qs = p.toString();
  return qs ? `/admin/revenue?${qs}` : "/admin/revenue";
}

/* ── Payload shape (mirrors admin_revenue_dashboard) ─────────────────── */

export type RevenuePeriods = {
  day: number;
  week: number;
  month: number;
  year: number;
};

export type PriorTotals = {
  gross: number;
  commission: number;
  taxes: number;
  payouts: number;
  net: number;
  refunds: number;
  refund_count: number;
  bookings: number;
  avg_booking_value: number;
};

export type RevenueTotals = {
  gross: number;
  commission: number;
  taxes: number;
  payouts: number;
  net: number;
  refunds: number;
  refund_count: number;
  bookings: number;
  /** How many of `bookings` have a known commission — see migration 0023. */
  commission_known: number;
  avg_booking_value: number;
  median_booking_value: number;
  avg_nights: number;
};

export type TrendPoint = {
  bucket: string;
  revenue: number;
  commission: number;
  bookings: number;
};

export type CityRevenue = {
  city: string;
  country: string;
  revenue: number;
  bookings: number;
  /** Same city over the immediately preceding window, for the delta. */
  prior_revenue: number;
};

export type TypeRevenue = {
  property_type: string;
  revenue: number;
  bookings: number;
};

export type ValueBand = {
  band: string;
  bookings: number;
  revenue: number;
};

export type RevenueDashboard = {
  range: {
    from: string;
    to: string;
    bucket: string;
    prior_from: string;
    prior_to: string;
    days: number;
  };
  periods: RevenuePeriods;
  /** The equivalent day/week/month/year immediately before. */
  periods_prior: RevenuePeriods;
  totals: RevenueTotals;
  prior: PriorTotals;
  trend: TrendPoint[];
  /** Prior window, same bucketing, aligned to `trend` for the dashed line. */
  trend_prior: number[];
  by_city: CityRevenue[];
  by_property_type: TypeRevenue[];
  value_distribution: ValueBand[];
};
