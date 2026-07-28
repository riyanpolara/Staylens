import Link from "next/link";
import { CalendarX2, CircleAlert, DatabaseZap, SearchX } from "lucide-react";
import type { FailureReason } from "@/lib/admin/bookings";

/**
 * Loading / empty / error presentation for the bookings screen.
 *
 * The distinction between "no bookings exist" and "no bookings match" matters:
 * the first is a state of the business, the second is a state of the filter,
 * and only the second has an action attached.
 */

export function BookingsSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <section className="admin-section admin-grid admin-grid-kpi">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card elev-sm admin-metric">
            <span className="admin-skeleton" style={{ width: "45%" }} />
            <span className="admin-skeleton" style={{ width: "60%", height: 24 }} />
            <span className="admin-skeleton" style={{ width: "30%" }} />
          </div>
        ))}
      </section>
      <div className="card elev-sm admin-bk-skeleton">
        {Array.from({ length: rows }).map((_, i) => (
          <span key={i} className="admin-skeleton" style={{ height: 34 }} />
        ))}
      </div>
      <span className="sr-only">Loading bookings…</span>
    </div>
  );
}

export function BookingsError({
  reason,
  message,
}: {
  reason: FailureReason;
  message: string;
}) {
  const Icon = reason === "setup" ? DatabaseZap : CircleAlert;
  const title =
    reason === "setup"
      ? "Booking queries not installed"
      : reason === "forbidden"
        ? "Not permitted"
        : "Bookings unavailable";

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
supabase/migrations/0017_bookings_admin.sql`}
        </pre>
      )}
    </div>
  );
}

/** No rows matched the current filters — offer the way back. */
export function NoMatches({ clearHref }: { clearHref: string }) {
  return (
    <div className="card elev-sm admin-empty">
      <span className="admin-empty-icon" aria-hidden>
        <SearchX size={26} />
      </span>
      <h2 className="card-title">No bookings match these filters</h2>
      <p className="text-muted">
        Try a different reference, guest or date range — or clear the filters to see everything.
      </p>
      <Link href={clearHref} scroll={false} className="btn btn-primary">
        Clear filters
      </Link>
    </div>
  );
}

/** The table itself is empty — nothing to filter, so no action is offered. */
export function NoBookingsYet() {
  return (
    <div className="card elev-sm admin-empty">
      <span className="admin-empty-icon" aria-hidden>
        <CalendarX2 size={26} />
      </span>
      <h2 className="card-title">No bookings yet</h2>
      <p className="text-muted">
        Reservations will appear here as soon as guests start booking. Search, filters and
        status controls are live and will work against real rows.
      </p>
    </div>
  );
}
