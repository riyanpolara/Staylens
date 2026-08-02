import { formatInrCompact } from "@/lib/currency";
import { pctDelta } from "@/components/admin/revenue/revenue-kpis";
import type { RevenueDashboard } from "@/lib/admin/revenue-query";

/**
 * The four breakdown panels: city, property type, value distribution, ledger.
 *
 * All server-rendered. The design's hover states on the donut and the histogram
 * need client JS; the figures themselves do not, so they render on the server
 * and each shape carries a `<title>` so the numbers stay reachable on hover and
 * to a screen reader.
 */

const TYPE_COLORS = [
  "var(--color-accent)",
  "var(--color-accent-2)",
  "var(--color-accent-300)",
  "var(--color-accent-2-300)",
  "var(--color-neutral-400)",
  "var(--color-accent-600)",
  "var(--color-accent-2-600)",
  "var(--color-neutral-300)",
];

export function RevenueByCity({ data }: { data: RevenueDashboard }) {
  const rows = data.by_city;
  const max = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <div className="card elev-sm admin-rev-card">
      <div>
        <div className="admin-rev-card-title">Revenue by city</div>
        <div className="admin-rev-card-sub">Top markets in this window</div>
      </div>

      {rows.length === 0 ? (
        <p className="admin-rev-empty">No city revenue in this window.</p>
      ) : (
        <div className="admin-rev-city-list">
          {rows.map((c) => {
            const delta = pctDelta(c.revenue, c.prior_revenue);
            return (
              <div key={`${c.city}-${c.country}`} className="admin-rev-city-row">
                <div className="admin-rev-city-name" title={`${c.city}${c.country ? `, ${c.country}` : ""}`}>
                  {c.city}
                </div>
                <div className="admin-rev-city-track">
                  <div
                    className="admin-rev-city-fill"
                    style={{ width: `${Math.max((c.revenue / max) * 100, 2)}%` }}
                  />
                </div>
                <div className="admin-rev-city-figures">
                  <div className="admin-rev-city-value">{formatInrCompact(c.revenue)}</div>
                  <div
                    className="admin-rev-delta admin-rev-delta-sm"
                    data-up={delta.up === true || undefined}
                    data-down={delta.up === false || undefined}
                  >
                    {delta.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RevenueByType({ data }: { data: RevenueDashboard }) {
  const rows = data.by_property_type;
  const total = rows.reduce((s, r) => s + r.revenue, 0);

  // Each arc's start offset is the sum of the lengths before it. Accumulated
  // with reduce rather than a mutable counter inside map(), so the render has
  // no side effects — which is also what the React Compiler requires.
  // Circumference at r=15.9 is ~99.9, so lengths double as percentages.
  const arcs = rows.reduce<
    {
      property_type: string;
      revenue: number;
      bookings: number;
      color: string;
      dash: string;
      offset: string;
      pct: number;
    }[]
  >((acc, r, i) => {
    const len = total > 0 ? (r.revenue / total) * 99.9 : 0;
    const startedAt = acc.reduce(
      (sum, a) => sum + (total > 0 ? (a.revenue / total) * 99.9 : 0),
      0,
    );
    acc.push({
      property_type: r.property_type,
      revenue: r.revenue,
      bookings: r.bookings,
      color: TYPE_COLORS[i % TYPE_COLORS.length],
      dash: `${len.toFixed(1)} ${(99.9 - len).toFixed(1)}`,
      offset: (-startedAt).toFixed(1),
      pct: total > 0 ? Math.round((r.revenue / total) * 100) : 0,
    });
    return acc;
  }, []);

  const top = arcs[0];

  return (
    <div className="card elev-sm admin-rev-card">
      <div>
        <div className="admin-rev-card-title">Revenue by property type</div>
        <div className="admin-rev-card-sub">Share of gross booking value</div>
      </div>

      {rows.length === 0 ? (
        <p className="admin-rev-empty">No property-type revenue in this window.</p>
      ) : (
        <>
          <div className="admin-rev-donut-wrap">
            <svg
              width={152}
              height={152}
              viewBox="0 0 42 42"
              className="admin-rev-donut"
              role="img"
              aria-label="Revenue share by property type"
            >
              <circle
                cx={21}
                cy={21}
                r={15.9}
                fill="none"
                stroke="color-mix(in srgb, var(--color-text) 8%, transparent)"
                strokeWidth={6.5}
              />
              {arcs.map((a) => (
                <circle
                  key={a.property_type}
                  cx={21}
                  cy={21}
                  r={15.9}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={6.5}
                  strokeDasharray={a.dash}
                  strokeDashoffset={a.offset}
                >
                  <title>{`${a.property_type}: ${formatInrCompact(a.revenue)} (${a.pct}%)`}</title>
                </circle>
              ))}
            </svg>

            <div className="admin-rev-legend">
              {arcs.map((a) => (
                <div key={a.property_type} className="admin-rev-legend-row">
                  <span className="admin-rev-dot" style={{ background: a.color }} aria-hidden />
                  <span className="admin-rev-legend-label">{a.property_type}</span>
                  <span className="admin-rev-legend-value">{formatInrCompact(a.revenue)}</span>
                  <span className="admin-rev-legend-pct">{a.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* The design's footnote is a claim about the data, so it is computed
              rather than copied — a hardcoded "villas are a third of revenue"
              would be wrong the moment the mix changed. */}
          {top && (
            <div className="admin-rev-card-foot">
              {top.property_type} leads at {top.pct}% of gross across{" "}
              {top.bookings} {top.bookings === 1 ? "booking" : "bookings"}.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function RevenueDistribution({ data }: { data: RevenueDashboard }) {
  const bands = data.value_distribution;
  const totalBookings = bands.reduce((s, b) => s + b.bookings, 0);
  const max = Math.max(...bands.map((b) => b.bookings), 1);
  const W = 1000;
  const H = 220;
  const slot = W / Math.max(bands.length, 1);

  return (
    <div className="card elev-sm admin-rev-card">
      <div className="admin-rev-card-head">
        <div>
          <div className="admin-rev-card-title">Booking value distribution</div>
          <div className="admin-rev-card-sub">
            Bookings per value band · median{" "}
            {formatInrCompact(data.totals.median_booking_value)}
          </div>
        </div>
        <span className="tag tag-neutral admin-rev-trend-tag">
          <span>Avg</span>
          {formatInrCompact(data.totals.avg_booking_value)}
        </span>
      </div>

      {totalBookings === 0 ? (
        <p className="admin-rev-empty">No bookings in this window.</p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height={200}
            preserveAspectRatio="none"
            className="admin-rev-dist"
            role="img"
            aria-label="Bookings per value band"
          >
            {bands.map((b, i) => {
              const h = (b.bookings / max) * (H - 20);
              return (
                <rect
                  key={b.band}
                  x={i * slot + slot * 0.18}
                  y={H - h}
                  width={slot * 0.64}
                  height={h}
                  rx={7}
                  fill={
                    b.bookings === max
                      ? "var(--color-accent)"
                      : "var(--color-accent-2)"
                  }
                >
                  <title>{`${b.band}: ${b.bookings} bookings · ${formatInrCompact(b.revenue)}`}</title>
                </rect>
              );
            })}
          </svg>

          <div className="admin-rev-dist-axis" aria-hidden>
            {bands.map((b) => (
              <span key={b.band}>{b.band}</span>
            ))}
          </div>

          <div className="admin-rev-card-foot admin-rev-card-foot-strong">
            {totalBookings} {totalBookings === 1 ? "booking" : "bookings"} in this
            window · average {formatInrCompact(data.totals.avg_booking_value)}
          </div>
        </>
      )}
    </div>
  );
}

export function RevenueLedger({
  data,
  periodLabel,
}: {
  data: RevenueDashboard;
  periodLabel: string;
}) {
  const { totals, prior } = data;

  /**
   * Only lines that come from real columns.
   *
   * The design also showed "Payment processing" and "Host referral credits".
   * Neither exists anywhere in the schema — there is no processing-fee column
   * and no referral-credit table — so inventing plausible figures for them
   * would put fabricated numbers in a financial ledger. They are omitted.
   */
  const lines = [
    { label: "Gross booking value", now: totals.gross, prior: prior.gross, strong: true },
    { label: "Platform commission", now: totals.commission, prior: prior.commission, strong: true },
    { label: "Host payouts", now: totals.payouts, prior: prior.payouts, strong: false },
    { label: "Refunds issued", now: totals.refunds, prior: prior.refunds, strong: false },
    { label: "Taxes collected", now: totals.taxes, prior: prior.taxes, strong: false },
    {
      label: "Net platform revenue",
      now: totals.commission - totals.refunds,
      prior: prior.commission - prior.refunds,
      strong: true,
    },
  ];

  return (
    <div className="card elev-sm admin-rev-card">
      <div className="admin-rev-card-title">Ledger</div>
      <div className="admin-table-scroll">
        <table className="table admin-rev-ledger">
          <thead>
            <tr>
              <th scope="col">Line</th>
              <th scope="col" data-numeric>
                {periodLabel}
              </th>
              <th scope="col" data-numeric>
                Prior
              </th>
              <th scope="col" data-numeric>
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const delta = pctDelta(l.now, l.prior);
              return (
                <tr key={l.label}>
                  <td data-strong={l.strong || undefined}>{l.label}</td>
                  <td data-numeric data-strong={l.strong || undefined}>
                    {formatInrCompact(l.now)}
                  </td>
                  <td data-numeric className="admin-rev-ledger-prior">
                    {formatInrCompact(l.prior)}
                  </td>
                  <td data-numeric>
                    <span
                      className="admin-rev-delta"
                      data-up={delta.up === true || undefined}
                      data-down={delta.up === false || undefined}
                    >
                      {delta.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="admin-rev-card-foot">
        Compared against {data.range.prior_from} to {data.range.prior_to}, the
        same span immediately before this one.
      </div>
    </div>
  );
}
