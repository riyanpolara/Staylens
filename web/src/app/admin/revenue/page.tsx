import { Suspense } from "react";
import { getRevenueDashboard } from "@/lib/admin/revenue";
import {
  RANGES,
  parseRevenueQuery,
  revenueHref,
  type RevenueQuery,
  type SearchParams,
} from "@/lib/admin/revenue-query";
import { RevenueToolbar } from "@/components/admin/revenue/revenue-toolbar";
import { RevenueKpis } from "@/components/admin/revenue/revenue-kpis";
import { RevenueTrendCard } from "@/components/admin/revenue/revenue-trend-card";
import {
  RevenueByCity,
  RevenueByType,
  RevenueDistribution,
  RevenueLedger,
} from "@/components/admin/revenue/revenue-breakdowns";
import {
  NoRevenueYet,
  RevenueError,
  RevenueSkeleton,
} from "@/components/admin/revenue/revenue-states";
import "./revenue.css";

/**
 * Revenue — the money ledger, built to the `staylens-admin-dashboard` handoff.
 *
 * A Server Component that reads its window from the URL and answers it with a
 * single `admin_revenue_dashboard()` call. Every KPI, both chart series and all
 * four breakdowns are aggregated in Postgres; nothing on this page sums a list.
 * The alternative — shipping bookings to the browser to total them — stops
 * working at the first few thousand rows and would send every guest's booking
 * amount to the client to render one headline number.
 */

export const metadata = { title: "Revenue" };

/** The window is request-time state, and money should never be stale. */
export const dynamic = "force-dynamic";

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const query = parseRevenueQuery(sp);

  const csvParams = new URLSearchParams({ range: query.range });
  if (query.bucket) csvParams.set("bucket", query.bucket);

  return (
    <section className="admin-rise admin-rev">
      {/* Outside the boundary: the tabs stay usable while figures load. */}
      <RevenueToolbar
        query={query}
        csvHref={`/api/admin/revenue-export?${csvParams.toString()}`}
      />

      <Suspense key={revenueHref(query)} fallback={<RevenueSkeleton />}>
        <RevenueBody query={query} />
      </Suspense>
    </section>
  );
}

async function RevenueBody({ query }: { query: RevenueQuery }) {
  const result = await getRevenueDashboard(query);
  if (!result.ok) {
    return <RevenueError reason={result.reason} message={result.message} />;
  }

  const data = result.data;
  const preset = RANGES.find((r) => r.key === query.range) ?? RANGES[1];

  // Commission and payouts are only known for bookings that recorded them.
  // Saying so is the difference between an incomplete figure and a wrong one.
  const commissionPartial =
    data.totals.bookings > 0 &&
    data.totals.commission_known < data.totals.bookings;

  if (data.totals.bookings === 0 && data.totals.refunds === 0) {
    return <NoRevenueYet />;
  }

  return (
    <>
      <RevenueKpis data={data} />

      {commissionPartial && (
        <p className="admin-rev-caveat" role="note">
          Commission and host payouts are recorded for{" "}
          {data.totals.commission_known} of {data.totals.bookings} bookings in
          this window. Bookings taken before the split was stored show no
          commission, so those two lines are lower bounds rather than totals.
        </p>
      )}

      <RevenueTrendCard data={data} />

      <div className="admin-rev-grid">
        <RevenueByCity data={data} />
        <RevenueByType data={data} />
      </div>

      <div className="admin-rev-grid">
        <RevenueDistribution data={data} />
        <RevenueLedger data={data} periodLabel={preset.short} />
      </div>
    </>
  );
}
