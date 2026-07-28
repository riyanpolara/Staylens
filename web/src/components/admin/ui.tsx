import type { ReactNode } from "react";
import * as Icons from "lucide-react";

/**
 * Shared admin presentation pieces. All visuals come from the Organic design
 * system classes (`card`, `tag`, `table`, `seg`…) defined in admin-theme.css —
 * nothing here hard-codes a colour, per the handoff spec.
 */

/* ── Cards ───────────────────────────────────────────────────────────── */

export function StatCard({
  label, value, delta, series, icon,
}: {
  label: string; value: string; delta?: string; series?: number[]; icon?: string;
}) {
  const I = icon
    ? (Icons as unknown as Record<string, Icons.LucideIcon>)[icon] ?? Icons.Circle
    : null;
  const positive = !delta?.trim().startsWith("-");
  return (
    <article className="card elev-sm admin-stat admin-rise">
      <div className="admin-stat-top">
        {I && (
          <span className="admin-stat-icon" aria-hidden>
            <I size={18} />
          </span>
        )}
        <p className="card-kicker">{label}</p>
      </div>
      <p className="admin-stat-value">{value}</p>
      <div className="admin-stat-foot">
        {delta && (
          <span className={`tag ${positive ? "tag-accent-2" : "tag-neutral"}`}>{delta}</span>
        )}
        {series && series.length > 1 && <Sparkline points={series} />}
      </div>
    </article>
  );
}

export function MetricCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  const positive = !delta?.trim().startsWith("-");
  return (
    <article className="card elev-sm admin-metric admin-rise">
      <p className="card-kicker">{label}</p>
      <p className="admin-metric-value">{value}</p>
      {delta && <span className={`tag ${positive ? "tag-accent-2" : "tag-neutral"}`}>{delta}</span>}
    </article>
  );
}

export function ChartCard({
  title, subtitle, actions, children, footer,
}: {
  title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <section className="card elev-sm admin-chart-card admin-rise">
      <header className="admin-chart-head">
        <div>
          {/* h2: the page <h1> lives in the admin header, so cards must not skip a level */}
          <h2 className="card-title admin-chart-title">{title}</h2>
          {subtitle && <p className="text-muted admin-chart-sub">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="admin-chart-body">{children}</div>
      {footer && <footer className="admin-chart-foot">{footer}</footer>}
    </section>
  );
}

/* ── Charts (pure SVG, no library) ───────────────────────────────────── */

function pathFor(values: number[], w: number, h: number, pad = 4) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => [
    pad + i * stepX,
    h - pad - ((v - min) / span) * (h - pad * 2),
  ] as const);
  // smooth cubic through midpoints
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const mx = (px + cx) / 2;
    d += ` C ${mx} ${py} ${mx} ${cy} ${cx} ${cy}`;
  }
  return { d, pts };
}

export function Sparkline({ points }: { points: number[] }) {
  const { d } = pathFor(points, 120, 40, 3);
  return (
    <svg width={120} height={40} viewBox="0 0 120 40" aria-hidden className="admin-spark">
      <path d={d} fill="none" stroke="var(--color-accent-500)" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AreaChart({
  data, compare, labels, height = 220,
}: {
  data: number[]; compare?: number[]; labels: string[]; height?: number;
}) {
  const W = 720;
  const { d, pts } = pathFor(data, W, height);
  const area = `${d} L ${pts[pts.length - 1][0]} ${height} L ${pts[0][0]} ${height} Z`;
  const cmp = compare ? pathFor(compare, W, height).d : null;
  return (
    <div className="admin-chart-wrap">
      <svg viewBox={`0 0 ${W} ${height}`} className="admin-svg" role="img"
        aria-label={`Series from ${labels[0]} to ${labels[labels.length - 1]}`}>
        <defs>
          <linearGradient id="admin-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-400)" stopOpacity="0.42" />
            <stop offset="100%" stopColor="var(--color-accent-400)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#admin-area)" />
        {cmp && (
          <path d={cmp} fill="none" stroke="var(--color-neutral-500)" strokeWidth={2}
            strokeDasharray="5 5" opacity={0.7} />
        )}
        <path d={d} fill="none" stroke="var(--color-accent-600)" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="var(--color-accent-600)" />
        ))}
      </svg>
      <ul className="admin-axis" aria-hidden>
        {labels.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </div>
  );
}

export function BarChart({
  data, height = 220,
}: {
  data: { label: string; confirmed: number; cancelled: number }[]; height?: number;
}) {
  const max = Math.max(...data.map((d) => d.confirmed + d.cancelled), 1);
  return (
    <div className="admin-chart-wrap">
      <div className="admin-bars" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="admin-bar-col" title={`${d.label}: ${d.confirmed} confirmed, ${d.cancelled} cancelled`}>
            <div className="admin-bar admin-bar-cancelled"
              style={{ height: `${(d.cancelled / max) * 100}%` }} />
            <div className="admin-bar admin-bar-confirmed"
              style={{ height: `${(d.confirmed / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <ul className="admin-axis" aria-hidden>
        {data.map((d) => <li key={d.label}>{d.label}</li>)}
      </ul>
    </div>
  );
}

export function Donut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 54, C = 2 * Math.PI * R;
  // Precompute each arc's length + start offset so render stays pure.
  const arcs = data.reduce<{ label: string; color: string; len: number; offset: number }[]>(
    (acc, d) => {
      const prev = acc[acc.length - 1];
      const offset = prev ? prev.offset + prev.len : 0;
      acc.push({ label: d.label, color: d.color, len: (d.value / total) * C, offset });
      return acc;
    },
    [],
  );
  return (
    <div className="admin-donut-wrap">
      <svg viewBox="0 0 140 140" className="admin-donut" role="img" aria-label="Property mix">
        <g transform="translate(70,70) rotate(-90)">
          {arcs.map((a) => (
            <circle key={a.label} r={R} fill="none" stroke={a.color} strokeWidth={18}
              strokeDasharray={`${a.len} ${C - a.len}`} strokeDashoffset={-a.offset} />
          ))}
        </g>
      </svg>
      <ul className="admin-legend">
        {data.map((d) => (
          <li key={d.label}>
            <span className="admin-legend-dot" style={{ background: d.color }} aria-hidden />
            <span>{d.label}</span>
            <span className="text-muted">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Misc ────────────────────────────────────────────────────────────── */

export function Segmented({
  options, value, onChange,
}: {
  options: string[]; value: string; onChange?: (v: string) => void;
}) {
  return (
    <div className="seg" role="tablist" aria-label="Range">
      {options.map((o) => (
        <button key={o} type="button" role="tab" aria-selected={o === value}
          className="seg-opt" data-active={o === value || undefined}
          onClick={() => onChange?.(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon = "Inbox", title, body, action,
}: {
  icon?: string; title: string; body: string; action?: ReactNode;
}) {
  const I = (Icons as unknown as Record<string, Icons.LucideIcon>)[icon] ?? Icons.Inbox;
  return (
    <div className="card elev-sm admin-empty">
      <span className="admin-empty-icon" aria-hidden><I size={26} /></span>
      <h2 className="card-title">{title}</h2>
      <p className="text-muted">{body}</p>
      {action}
    </div>
  );
}

export function ActivityTimeline({
  items,
}: {
  items: { title: string; meta: string; kind: string }[];
}) {
  const iconFor: Record<string, string> = {
    booking: "CalendarCheck", property: "Building2", host: "BadgeCheck",
    refund: "Undo2", alert: "ShieldAlert",
  };
  return (
    <ul className="admin-timeline">
      {items.map((it) => {
        const I = (Icons as unknown as Record<string, Icons.LucideIcon>)[iconFor[it.kind] ?? "Circle"] ?? Icons.Circle;
        return (
          <li key={it.title} className="admin-timeline-item">
            <span className="admin-timeline-icon" aria-hidden><I size={15} /></span>
            <div>
              <p className="admin-timeline-title">{it.title}</p>
              <p className="text-muted admin-timeline-meta">{it.meta}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
