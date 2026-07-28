import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { bookingsHref, type BookingQuery } from "@/lib/admin/bookings-query";

/**
 * Server-rendered pager.
 *
 * Plain links, so pages are crawlable-by-keyboard, open in a new tab, and work
 * without JavaScript. The window is capped at five numbers with ellipses —
 * the row count can grow without the control growing with it.
 */

/** Page numbers to render: always first and last, plus a window around current. */
function pageWindow(current: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);

  const pages = new Set<number>([1, count, current]);
  for (const p of [current - 1, current + 1]) {
    if (p > 1 && p < count) pages.add(p);
  }
  // Keep the control a stable width near the ends.
  if (current <= 3) [2, 3, 4].forEach((p) => p < count && pages.add(p));
  if (current >= count - 2) [count - 3, count - 2, count - 1].forEach((p) => p > 1 && pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) out.push("gap");
    out.push(p);
    previous = p;
  }
  return out;
}

export function Pagination({
  query,
  page,
  pageCount,
  total,
  pageSize,
  rowsOnPage,
}: {
  query: BookingQuery;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  rowsOnPage: number;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = total === 0 ? 0 : first + rowsOnPage - 1;

  return (
    <nav className="admin-bk-pager" aria-label="Bookings pagination">
      <p className="text-muted admin-bk-pager-count">
        {total === 0 ? (
          "No bookings"
        ) : (
          <>
            Showing <span className="admin-num">{first.toLocaleString()}</span>–
            <span className="admin-num">{last.toLocaleString()}</span> of{" "}
            <span className="admin-num">{total.toLocaleString()}</span>
          </>
        )}
      </p>

      {pageCount > 1 && (
        <div className="admin-bk-pager-controls">
          {page > 1 ? (
            <Link
              className="btn btn-secondary btn-icon"
              href={bookingsHref(query, { page: page - 1 })}
              scroll={false}
              aria-label="Previous page"
              rel="prev"
            >
              <ChevronLeft size={16} aria-hidden />
            </Link>
          ) : (
            <span className="btn btn-secondary btn-icon" aria-disabled="true" data-disabled>
              <ChevronLeft size={16} aria-hidden />
            </span>
          )}

          <ul className="admin-bk-pager-pages">
            {pageWindow(page, pageCount).map((p, i) =>
              p === "gap" ? (
                <li key={`gap-${i}`} className="admin-bk-pager-gap" aria-hidden>
                  …
                </li>
              ) : (
                <li key={p}>
                  <Link
                    className="btn btn-secondary admin-bk-pager-page"
                    href={bookingsHref(query, { page: p })}
                    scroll={false}
                    data-current={p === page || undefined}
                    aria-current={p === page ? "page" : undefined}
                    aria-label={`Page ${p}`}
                  >
                    {p}
                  </Link>
                </li>
              ),
            )}
          </ul>

          {page < pageCount ? (
            <Link
              className="btn btn-secondary btn-icon"
              href={bookingsHref(query, { page: page + 1 })}
              scroll={false}
              aria-label="Next page"
              rel="next"
            >
              <ChevronRight size={16} aria-hidden />
            </Link>
          ) : (
            <span className="btn btn-secondary btn-icon" aria-disabled="true" data-disabled>
              <ChevronRight size={16} aria-hidden />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
