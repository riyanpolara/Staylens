import { formatInrCompact } from "@/lib/currency";
import type { RevenueDashboard } from "@/lib/admin/revenue-query";

/**
 * The six headline cards: coloured dot, label, figure, delta, note.
 *
 * Every delta is computed from a real prior figure returned by the RPC. Where
 * there is no prior to compare against — a brand-new platform, or a period with
 * no sales before it — the card says "no prior period" instead of showing a
 * fabricated percentage or a misleading "+100%".
 */

export type Delta = { text: string; up: boolean | null };

/**
 * Percentage change, or null when the comparison is meaningless.
 *
 * Growth from zero is not "+100%" — it is undefined, and rendering a number
 * there is how a dashboard starts lying on day one.
 */
export function pctDelta(now: number, prior: number): Delta {
  if (prior <= 0) return { text: now > 0 ? "New" : "—", up: now > 0 ? true : null };
  const pct = ((now - prior) / prior) * 100;
  const sign = pct >= 0 ? "+" : "−";
  return { text: `${sign}${Math.abs(pct).toFixed(1)}%`, up: pct >= 0 };
}

function Card({
  label,
  value,
  delta,
  note,
  dot,
  index,
}: {
  label: string;
  value: string;
  delta: Delta;
  note: string;
  dot: string;
  index: number;
}) {
  return (
    <div
      className="card elev-sm admin-rev-kpi"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="admin-rev-kpi-top">
        <span className="admin-rev-dot" style={{ background: dot }} aria-hidden />
        <span className="admin-rev-kpi-label">{label}</span>
      </div>
      <div className="admin-rev-kpi-value">{value}</div>
      <div className="admin-rev-kpi-foot">
        <span
          className="admin-rev-delta"
          data-up={delta.up === true || undefined}
          data-down={delta.up === false || undefined}
        >
          {delta.text}
        </span>
        <span className="admin-rev-kpi-note">{note}</span>
      </div>
    </div>
  );
}

export function RevenueKpis({ data }: { data: RevenueDashboard }) {
  const { periods, periods_prior, totals, prior } = data;
  const accent = "var(--color-accent)";
  const accent2 = "var(--color-accent-2)";

  // Trend for the window as a whole, which is also what the chart's tag shows.
  const trend = pctDelta(totals.gross, prior.gross);

  const cards = [
    {
      label: "Daily revenue",
      value: formatInrCompact(periods.day),
      delta: pctDelta(periods.day, periods_prior.day),
      note: "vs prior day",
      dot: accent,
    },
    {
      label: "Weekly revenue",
      value: formatInrCompact(periods.week),
      delta: pctDelta(periods.week, periods_prior.week),
      note: "vs prior week",
      dot: accent,
    },
    {
      label: "Monthly revenue",
      value: formatInrCompact(periods.month),
      delta: pctDelta(periods.month, periods_prior.month),
      note: "vs prior month",
      dot: accent,
    },
    {
      label: "Yearly revenue",
      value: formatInrCompact(periods.year),
      delta: pctDelta(periods.year, periods_prior.year),
      note: "vs prior year",
      dot: accent,
    },
    {
      label: "Average booking value",
      value: formatInrCompact(totals.avg_booking_value),
      delta: pctDelta(totals.avg_booking_value, prior.avg_booking_value),
      note: `median ${formatInrCompact(totals.median_booking_value)}`,
      dot: accent2,
    },
    {
      label: "Revenue trend",
      value: trend.text,
      delta: {
        text:
          trend.up === null ? "No prior period" : trend.up ? "Growing" : "Declining",
        up: trend.up,
      },
      note: "vs the window before",
      dot: accent2,
    },
  ];

  return (
    <div className="admin-rev-kpis">
      {cards.map((c, i) => (
        <Card key={c.label} {...c} index={i} />
      ))}
    </div>
  );
}
