import Link from "next/link";
import { CircleAlert, DatabaseZap, SearchX, ShieldAlert, UsersRound } from "lucide-react";
import type { FailureReason } from "@/lib/admin/users";
import { RetryButton } from "@/components/admin/retry-button";

/**
 * Loading / empty / error surfaces for the users table.
 *
 * Per the handoff spec: the skeleton uses the real radii and the real column
 * widths so nothing shifts when data lands; the empty state offers the
 * filter-clearing action; the error state names the resource that failed and
 * offers a retry.
 *
 * "No users match" and "No users yet" are kept apart on purpose — the first is a
 * state of the filter and has an action, the second is a state of the business
 * and does not.
 */

const HEADERS = ["User", "Country", "Role", "Bookings", "Joined", "Last seen", "Status"];

export function UsersTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="card elev-sm admin-table-scroll" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading users…</span>
      <table className="table" aria-hidden>
        <thead>
          <tr>
            {HEADERS.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}>
              <td>
                <span className="admin-us-who">
                  <span className="admin-skeleton admin-skeleton-icon" style={{ marginInlineStart: 0 }} />
                  <span className="admin-cell-main" style={{ flex: 1 }}>
                    <span className="admin-skeleton" style={{ width: "58%" }} />
                    <span className="admin-skeleton admin-skeleton-sm" style={{ width: "76%" }} />
                  </span>
                </span>
              </td>
              <td>
                <span className="admin-skeleton" style={{ width: "70%" }} />
              </td>
              <td>
                <span className="admin-skeleton admin-skeleton-tag" style={{ width: 58 }} />
              </td>
              <td>
                <span className="admin-skeleton" style={{ width: 30 }} />
              </td>
              <td>
                <span className="admin-skeleton" style={{ width: 78 }} />
              </td>
              <td>
                <span className="admin-skeleton" style={{ width: 58 }} />
              </td>
              <td>
                <span className="admin-skeleton admin-skeleton-tag" style={{ width: 64 }} />
              </td>
              <td>
                <span className="admin-skeleton admin-skeleton-icon" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NoUsersMatch({ clearHref }: { clearHref: string }) {
  return (
    <div className="card elev-sm admin-empty">
      <span className="admin-empty-icon" aria-hidden>
        <SearchX size={26} />
      </span>
      <h2 className="card-title">No users match</h2>
      <p className="text-muted">
        Nothing matches that search and filter combination. Adjust it, or clear the filters to see
        every account.
      </p>
      <Link className="btn btn-primary" href={clearHref}>
        Clear filters
      </Link>
    </div>
  );
}

export function NoUsersYet() {
  return (
    <div className="card elev-sm admin-empty">
      <span className="admin-empty-icon" aria-hidden>
        <UsersRound size={26} />
      </span>
      <h2 className="card-title">No users yet</h2>
      <p className="text-muted">
        Accounts appear here as soon as someone signs up through the app.
      </p>
    </div>
  );
}

export function UsersError({
  reason,
  message,
}: {
  reason: FailureReason;
  message: string;
}) {
  const Icon = reason === "setup" ? DatabaseZap : reason === "forbidden" ? ShieldAlert : CircleAlert;
  const title =
    reason === "setup"
      ? "User queries not installed"
      : reason === "forbidden"
        ? "Not permitted"
        : "Could not load users";

  return (
    <div className="card elev-sm admin-empty" role="alert">
      <span className="admin-empty-icon admin-empty-icon-warn" aria-hidden>
        <Icon size={26} />
      </span>
      <h2 className="card-title">{title}</h2>
      <p className="text-muted">{message}</p>
      {/* A retry cannot fix a missing migration or a non-admin session. */}
      {reason === "unavailable" && <RetryButton />}
    </div>
  );
}
