import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  PROPERTY_PAGE_SIZE,
  propertyHref,
  type PropertyQuery,
} from "@/lib/admin/property-query";

/**
 * "Showing 11–20 of 6,480" plus a windowed page strip. Links, not buttons —
 * the page number lives in the URL like every other bit of table state.
 */

/** At most 5 numbered pages, always including the current one. */
function windowFor(page: number, pageCount: number): number[] {
  const span = Math.min(5, pageCount);
  let start = Math.max(1, page - Math.floor(span / 2));
  if (start + span - 1 > pageCount) start = pageCount - span + 1;
  return Array.from({ length: span }, (_, i) => start + i);
}

export function PropertiesPagination({
  query,
  page,
  pageCount,
  total,
}: {
  query: PropertyQuery;
  page: number;
  pageCount: number;
  total: number;
}) {
  const from = (page - 1) * PROPERTY_PAGE_SIZE + 1;
  const to = Math.min(page * PROPERTY_PAGE_SIZE, total);

  return (
    <nav className="admin-pagination" aria-label="Properties pages">
      <p className="text-muted admin-page-note">
        Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} properties
      </p>

      <div className="admin-page-controls">
        <PageStep
          query={query}
          to={page - 1}
          disabled={page <= 1}
          label="Previous page"
          icon={<ChevronLeft size={15} />}
        />

        {windowFor(page, pageCount).map((n) => (
          <Link
            key={n}
            className="btn btn-secondary admin-page-num"
            data-active={n === page || undefined}
            aria-current={n === page ? "page" : undefined}
            href={propertyHref(query, { page: n })}
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
          icon={<ChevronRight size={15} />}
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
  query: PropertyQuery;
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
      href={propertyHref(query, { page: to })}
      scroll={false}
    >
      {icon}
    </Link>
  );
}
