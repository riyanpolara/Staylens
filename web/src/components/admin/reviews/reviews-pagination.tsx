import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { reviewsHref, type ReviewQuery } from "@/lib/admin/review-query";
import { ReviewPageSizePicker } from "@/components/admin/reviews/review-page-size-picker";

/**
 * "Showing 11–20 of 43,307" plus a windowed page strip and a rows-per-page
 * control. Links, not buttons — the page lives in the URL like every other bit
 * of table state, so paging is shareable and survives a refresh.
 */

/** At most 5 numbered pages, always including the current one. */
function windowFor(page: number, pageCount: number): number[] {
  const span = Math.min(5, pageCount);
  let start = Math.max(1, page - Math.floor(span / 2));
  if (start + span - 1 > pageCount) start = pageCount - span + 1;
  return Array.from({ length: span }, (_, i) => start + i);
}

export function ReviewsPagination({
  query,
  page,
  pageCount,
  total,
  pageSize,
  rowsOnPage,
}: {
  query: ReviewQuery;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  rowsOnPage: number;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : from + rowsOnPage - 1;

  return (
    <nav className="admin-pagination" aria-label="Review pages">
      <p className="text-muted admin-page-note">
        {total === 0
          ? "No reviews"
          : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} reviews`}
      </p>

      <ReviewPageSizePicker query={query} pageSize={pageSize} />

      <div className="admin-page-controls">
        <PageStep
          query={query}
          to={page - 1}
          disabled={page <= 1}
          label="Previous page"
          icon={<ChevronLeft size={15} aria-hidden />}
        />

        {windowFor(page, pageCount).map((n) => (
          <Link
            key={n}
            className="btn btn-secondary admin-page-num"
            data-active={n === page || undefined}
            aria-current={n === page ? "page" : undefined}
            href={reviewsHref(query, { page: n })}
            scroll={false}
          >
            {n}
          </Link>
        ))}

        <PageStep
          query={query}
          to={page + 1}
          disabled={page >= pageCount}
          label="Next page"
          icon={<ChevronRight size={15} aria-hidden />}
        />
      </div>
    </nav>
  );
}

function PageStep({
  query,
  to,
  disabled,
  label,
  icon,
}: {
  query: ReviewQuery;
  to: number;
  disabled: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="btn btn-secondary btn-icon" aria-disabled="true" aria-label={label}>
        {icon}
      </span>
    );
  }
  return (
    <Link
      className="btn btn-secondary btn-icon"
      aria-label={label}
      href={reviewsHref(query, { page: to })}
      scroll={false}
    >
      {icon}
    </Link>
  );
}
