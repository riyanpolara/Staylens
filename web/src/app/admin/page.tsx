import { Suspense } from "react";
import { ActivityTimeline, ChartCard, Donut, StatCard } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { BookingsChart } from "@/components/admin/bookings-chart";
import {
  ChartEmpty,
  DashboardError,
  DashboardSkeleton,
  MetricUnavailable,
} from "@/components/admin/dashboard-states";
import {
  formatCount,
  formatCurrency,
  getDashboardData,
} from "@/lib/admin/dashboard";

export const metadata = { title: "Dashboard" };
// Metrics must reflect the database on each visit, not a build-time snapshot.
export const dynamic = "force-dynamic";

/** Palette for the property-mix donut, taken from the design-system ramps. */
const MIX_COLORS = [
  "var(--color-accent-500)",
  "var(--color-accent-2-500)",
  "var(--color-accent-300)",
  "var(--color-neutral-400)",
  "var(--color-accent-2-300)",
];

async function DashboardContent() {
  const result = await getDashboardData(12);

  if (!result.ok) {
    return <DashboardError reason={result.reason} message={result.message} />;
  }

  const { kpis, revenue_series, bookings_series, property_mix, recent_activity } =
    result.data;

  const mix = property_mix.map((s, i) => ({
    label: s.label,
    value: s.value,
    color: MIX_COLORS[i % MIX_COLORS.length],
  }));

  return (
    <>
      <section className="admin-section admin-grid admin-grid-kpi" aria-label="Key metrics">
        <StatCard label="Total users" value={formatCount(kpis.total_users)} icon="Users" />
        <StatCard label="Total properties" value={formatCount(kpis.total_properties)} icon="Building2" />
        <StatCard label="Total bookings" value={formatCount(kpis.total_bookings)} icon="CalendarCheck" />
        <StatCard label="Total revenue" value={formatCurrency(kpis.total_revenue)} icon="Wallet" />
        <StatCard
          label="Average rating"
          value={kpis.avg_rating != null ? `${kpis.avg_rating} / 5` : "—"}
          icon="Star"
        />
        <StatCard label="Active hosts" value={formatCount(kpis.active_hosts)} icon="BadgeCheck" />

        {/* Two metrics the schema can't answer yet — shown honestly rather
            than filled with a placeholder number. */}
        <article className="card elev-sm admin-stat admin-rise">
          <div className="admin-stat-top">
            <span className="admin-stat-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <p className="card-kicker">Pending reviews</p>
          </div>
          <MetricUnavailable note="`reviews` has no moderation status column yet." />
          <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
            {formatCount(kpis.total_reviews)} reviews total
          </p>
        </article>

        <article className="card elev-sm admin-stat admin-rise">
          <div className="admin-stat-top">
            <span className="admin-stat-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <p className="card-kicker">AI searches</p>
          </div>
          <MetricUnavailable note="No ai_search_events table exists yet." />
          <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
            Needs search-event logging
          </p>
        </article>
      </section>

      <section className="admin-section admin-grid admin-grid-2">
        {revenue_series.length > 0 ? (
          <RevenueChart series={revenue_series} />
        ) : (
          <ChartCard title="Revenue" subtitle="Gross booking value, cancellations excluded">
            <ChartEmpty label="No bookings recorded yet — revenue will appear here." />
          </ChartCard>
        )}

        <ChartCard title="Property mix" subtitle="Share of live listings by room type">
          {mix.length > 0 ? (
            <Donut data={mix} />
          ) : (
            <ChartEmpty label="No active listings to summarise." />
          )}
        </ChartCard>
      </section>

      <section className="admin-section admin-grid admin-grid-2">
        {bookings_series.length > 0 ? (
          <BookingsChart series={bookings_series} />
        ) : (
          <ChartCard title="Bookings" subtitle="Confirmed vs cancelled">
            <ChartEmpty label="No bookings in the selected period." />
          </ChartCard>
        )}

        <ChartCard title="Recent activity" subtitle="Latest changes across the marketplace">
          {recent_activity.length > 0 ? (
            <ActivityTimeline items={recent_activity} />
          ) : (
            <ChartEmpty label="Nothing has happened yet." />
          )}
        </ChartCard>
      </section>
    </>
  );
}

export default function AdminDashboardPage() {
  // Streamed: the shell paints immediately, metrics swap in when the
  // aggregate resolves.
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
