import { CircleAlert, DatabaseZap, ShieldAlert, Wallet } from "lucide-react";
import type { FailureReason } from "@/lib/admin/revenue";
import { RetryButton } from "@/components/admin/retry-button";

/**
 * Loading / empty / error surfaces for the revenue screen.
 *
 * Same contract as the users and reviews equivalents: the skeleton mirrors the
 * real layout so nothing shifts when data lands, and the error state names the
 * resource that failed and only offers a retry when retrying could help.
 */

export function RevenueSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading revenue…</span>

      <div className="admin-grid-kpi" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card elev-sm admin-stat">
            <span className="admin-skeleton admin-skeleton-sm" style={{ width: "45%" }} />
            <span className="admin-skeleton" style={{ width: "68%", height: 26 }} />
          </div>
        ))}
      </div>

      <div className="admin-grid-kpi" aria-hidden style={{ marginTop: "var(--space-4)" }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card elev-sm admin-stat">
            <span className="admin-skeleton admin-skeleton-sm" style={{ width: "52%" }} />
            <span className="admin-skeleton" style={{ width: "60%", height: 22 }} />
          </div>
        ))}
      </div>

      <div className="card elev-sm admin-chart-card" aria-hidden style={{ marginTop: "var(--space-4)" }}>
        <span className="admin-skeleton" style={{ width: "30%" }} />
        <span className="admin-skeleton" style={{ width: "100%", height: 220 }} />
      </div>

      <div className="admin-grid-2" aria-hidden style={{ marginTop: "var(--space-4)" }}>
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="card elev-sm admin-chart-card">
            <span className="admin-skeleton" style={{ width: "38%" }} />
            <span className="admin-skeleton" style={{ width: "100%", height: 180 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NoRevenueYet() {
  return (
    <div className="card elev-sm admin-empty">
      <span className="admin-empty-icon" aria-hidden>
        <Wallet size={26} />
      </span>
      <h2 className="card-title">No revenue in this period</h2>
      <p className="text-muted">
        Figures appear here as bookings are paid for. Try a wider date range.
      </p>
    </div>
  );
}

export function RevenueError({
  reason,
  message,
}: {
  reason: FailureReason;
  message: string;
}) {
  const Icon =
    reason === "setup" ? DatabaseZap : reason === "forbidden" ? ShieldAlert : CircleAlert;
  const title =
    reason === "setup"
      ? "Revenue queries not installed"
      : reason === "forbidden"
        ? "Not permitted"
        : "Could not load revenue";

  return (
    <div className="card elev-sm admin-empty" role="alert">
      <span className="admin-empty-icon admin-empty-icon-warn" aria-hidden>
        <Icon size={26} />
      </span>
      <h2 className="card-title">{title}</h2>
      <p className="text-muted">{message}</p>
      {reason === "unavailable" && <RetryButton />}
    </div>
  );
}
