import { formatInrCompact } from "@/lib/currency";
import { pctDelta } from "@/components/admin/revenue/revenue-kpis";
import type { RevenueDashboard } from "@/lib/admin/revenue-query";

/**
 * "Revenue over time" — area chart, prior period as a dashed line, trend tag,
 * and the gross/commission/payouts/refunds/taxes split beneath it.
 *
 * Server-rendered SVG. The design's hover tooltip needs client JS and per-point
 * hit areas; the shape, the dashed comparison and the axis are all static, so
 * they render on the server and the chart works with JS disabled. Points carry
 * a `<title>` so the values are still reachable on hover and by screen readers.
 *
 * Both series share one scale — drawing the prior period against its own maximum
 * would make a worse period look identical to a better one.
 */

const W = 1000;
const H = 260;

function path(values: number[], max: number): { line: string; area: string } {
  if (values.length === 0) return { line: "", area: "" };
  if (values.length === 1) {
    const y = H - (values[0] / max) * H;
    return { line: `M 0 ${y} L ${W} ${y}`, area: `M 0 ${y} L ${W} ${y} L ${W} ${H} L 0 ${H} Z` };
  }
  const step = W / (values.length - 1);
  const pts = values.map((v, i) => [i * step, H - (v / max) * H] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  return { line, area };
}

/** At most 6 axis labels, always the first and last. */
function axisLabels(buckets: string[], bucket: string): { x: number; label: string }[] {
  if (buckets.length === 0) return [];
  const max = 6;
  const step = Math.max(1, Math.ceil(buckets.length / max));
  return buckets
    .map((b, i) => ({ i, b }))
    .filter(({ i }) => i === 0 || i === buckets.length - 1 || i % step === 0)
    .map(({ i, b }) => ({
      x: buckets.length === 1 ? 50 : (i / (buckets.length - 1)) * 100,
      label: shortLabel(b, bucket),
    }));
}

function shortLabel(iso: string, bucket: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const opts: Intl.DateTimeFormatOptions =
    bucket === "year"
      ? { year: "numeric" }
      : bucket === "month"
        ? { month: "short", year: "2-digit" }
        : { day: "2-digit", month: "short" };
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(d);
}

export function RevenueTrendCard({ data }: { data: RevenueDashboard }) {
  const { trend, trend_prior, totals, prior, range } = data;
  const current = trend.map((p) => p.revenue);
  const previous = trend_prior;

  // One scale for both series, floored at 1 so an all-zero window still draws.
  const max = Math.max(...current, ...previous, 1);
  const now = path(current, max);
  const before = path(previous, max);
  const trendDelta = pctDelta(totals.gross, prior.gross);

  const split = [
    { label: "Gross booking value", value: totals.gross, share: 1 },
    { label: "Platform commission", value: totals.commission, share: null },
    { label: "Host payouts", value: totals.payouts, share: null },
    { label: "Refunds", value: totals.refunds, share: null },
    { label: "Taxes collected", value: totals.taxes, share: null },
  ];

  const shareOf = (v: number) =>
    totals.gross > 0 ? `${((v / totals.gross) * 100).toFixed(1)}% of gross` : "—";

  return (
    <div className="card elev-sm admin-rev-card">
      <div className="admin-rev-card-head">
        <div>
          <div className="admin-rev-card-title">Revenue over time</div>
          <div className="admin-rev-card-sub">
            Gross booking value · dashed line is the prior period
          </div>
        </div>
        <span className="tag tag-accent-2 admin-rev-trend-tag">
          <span>Trend</span>
          {trendDelta.text}
        </span>
      </div>

      {current.length === 0 ? (
        <p className="admin-rev-empty">No revenue in this window.</p>
      ) : (
        <div className="admin-rev-chart">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height={250}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Revenue from ${range.from} to ${range.to}, with the prior period for comparison`}
          >
            <defs>
              <linearGradient id="admin-rev-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.30" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>

            <path d={now.area} fill="url(#admin-rev-fill)" />

            {/* Prior period. Drawn first so the current line sits on top. */}
            {previous.some((v) => v > 0) && (
              <path
                d={before.line}
                fill="none"
                stroke="color-mix(in srgb, var(--color-text) 26%, transparent)"
                strokeWidth={1.75}
                strokeDasharray="5 6"
                vectorEffect="non-scaling-stroke"
              />
            )}

            <path
              d={now.line}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Values stay reachable without the client-side tooltip. */}
            {trend.map((p, i) => {
              const x = trend.length === 1 ? W / 2 : (i / (trend.length - 1)) * W;
              const y = H - (p.revenue / max) * H;
              return (
                <circle
                  key={p.bucket}
                  cx={x}
                  cy={y}
                  r={4}
                  fill="var(--color-bg)"
                  stroke="var(--color-accent)"
                  strokeWidth={2.5}
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{`${shortLabel(p.bucket, range.bucket)}: ${formatInrCompact(p.revenue)} · ${p.bookings} bookings`}</title>
                </circle>
              );
            })}
          </svg>

          <div className="admin-rev-axis" aria-hidden>
            {axisLabels(trend.map((p) => p.bucket), range.bucket).map((a) => (
              <span key={a.label} style={{ left: `${a.x}%` }}>
                {a.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="admin-rev-split">
        {split.map((s) => (
          <div key={s.label}>
            <div className="admin-rev-split-label">{s.label}</div>
            <div className="admin-rev-split-value">{formatInrCompact(s.value)}</div>
            <div className="admin-rev-split-share">
              {s.share === 1 ? "100.0% of gross" : shareOf(s.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
