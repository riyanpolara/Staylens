import Link from "next/link";
import { CircleAlert, DatabaseZap, MessageSquareQuote, SearchX, ShieldAlert } from "lucide-react";
import type { FailureReason } from "@/lib/admin/reviews";
import { RetryButton } from "@/components/admin/retry-button";

/**
 * Loading / empty / error surfaces for the reviews table.
 *
 * Same contract as the users equivalents: the skeleton uses the real radii and
 * column widths so nothing shifts when data lands; the empty state offers the
 * filter-clearing action; the error state names the resource that failed and
 * offers a retry only when retrying could help.
 *
 * "No reviews match" and "No reviews yet" are kept apart on purpose — the first
 * is a state of the filter and has an action, the second is a state of the
 * business and does not.
 */

const HEADERS = ["Review", "Property", "Host", "Rating", "Date", "Status"];

export function ReviewsTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="card elev-sm admin-table-scroll" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading reviews…</span>
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
                  <span
                    className="admin-skeleton admin-skeleton-icon"
                    style={{ marginInlineStart: 0 }}
                  />
                  <span className="admin-cell-main" style={{ flex: 1 }}>
                    <span className="admin-skeleton" style={{ width: "42%" }} />
                    <span className="admin-skeleton admin-skeleton-sm" style={{ width: "88%" }} />
                  </span>
                </span>
              </td>
              <td>
                <span className="admin-cell-main">
                  <span className="admin-skeleton" style={{ width: "72%" }} />
                  <span className="admin-skeleton admin-skeleton-sm" style={{ width: "48%" }} />
                </span>
              </td>
              <td>
                <span className="admin-skeleton" style={{ width: "60%" }} />
              </td>
              <td>
                <span className="admin-skeleton" style={{ width: 42 }} />
              </td>
              <td>
                <span className="admin-skeleton" style={{ width: 78 }} />
              </td>
              <td>
                <span className="admin-skeleton admin-skeleton-tag" style={{ width: 70 }} />
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

export function NoReviewsMatch({ clearHref }: { clearHref: string }) {
  return (
    <div className="card elev-sm admin-empty">
      <span className="admin-empty-icon" aria-hidden>
        <SearchX size={26} />
      </span>
      <h2 className="card-title">No reviews match</h2>
      <p className="text-muted">
        Nothing matches that search and filter combination. Adjust it, or clear the
        filters to see every review.
      </p>
      <Link className="btn btn-primary" href={clearHref}>
        Clear filters
      </Link>
    </div>
  );
}

export function NoReviewsYet() {
  return (
    <div className="card elev-sm admin-empty">
      <span className="admin-empty-icon" aria-hidden>
        <MessageSquareQuote size={26} />
      </span>
      <h2 className="card-title">No reviews yet</h2>
      <p className="text-muted">
        Reviews appear here as guests write them, and as listings are imported.
      </p>
    </div>
  );
}

export function ReviewsError({
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
      ? "Review queries not installed"
      : reason === "forbidden"
        ? "Not permitted"
        : "Could not load reviews";

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
