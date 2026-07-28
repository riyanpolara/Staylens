import { CircleAlert, DatabaseZap, Inbox } from "lucide-react";

/**
 * Loading / empty / error presentation for the dashboard home.
 * All three reuse the Organic design-system classes, so the screen never
 * changes shape between states (skeletons sit at the real radii).
 */

/** Skeleton shown while the aggregate query runs. */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <section className="admin-section admin-grid admin-grid-kpi">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card elev-sm admin-stat">
            <div className="admin-stat-top">
              <span
                className="admin-skeleton"
                style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)" }}
              />
              <span className="admin-skeleton" style={{ width: "45%" }} />
            </div>
            <span className="admin-skeleton" style={{ width: "60%", height: 26 }} />
            <span className="admin-skeleton" style={{ width: "35%" }} />
          </div>
        ))}
      </section>
      <section className="admin-section admin-grid admin-grid-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card elev-sm admin-chart-card">
            <span className="admin-skeleton" style={{ width: "30%", height: 18 }} />
            <span
              className="admin-skeleton"
              style={{ height: 220, marginTop: 16, borderRadius: 16 }}
            />
          </div>
        ))}
      </section>
      <span className="sr-only">Loading dashboard metrics…</span>
    </div>
  );
}

/** Shown when the aggregate can't be read (migration missing, no permission…). */
export function DashboardError({
  reason,
  message,
}: {
  reason: "setup" | "forbidden" | "unavailable";
  message: string;
}) {
  const Icon = reason === "setup" ? DatabaseZap : CircleAlert;
  const title =
    reason === "setup"
      ? "Dashboard queries not installed"
      : reason === "forbidden"
        ? "Not permitted"
        : "Metrics unavailable";

  return (
    <div className="card elev-sm admin-empty" role="alert">
      <span className="admin-empty-icon" aria-hidden>
        <Icon size={26} />
      </span>
      <h2 className="card-title">{title}</h2>
      <p className="text-muted">{message}</p>
      {reason === "setup" && (
        <pre className="admin-code">
{`-- run in the Supabase SQL editor
supabase/migrations/0013_admin_rls.sql
supabase/migrations/0016_admin_dashboard.sql`}
        </pre>
      )}
    </div>
  );
}

/** Inline empty state used inside a chart card when a series has no rows. */
export function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="admin-chart-empty">
      <Inbox size={22} aria-hidden />
      <p className="text-muted">{label}</p>
    </div>
  );
}

/** Value slot for a KPI the schema can't answer yet. */
export function MetricUnavailable({ note }: { note: string }) {
  return (
    <span className="admin-metric-na" title={note}>
      Not tracked
    </span>
  );
}
