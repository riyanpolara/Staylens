import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, Star } from "lucide-react";
import { tagClassFor } from "@/lib/admin/types";
import { formatDateShort, initialsOf } from "@/lib/admin/user-query";
import {
  STATUS_LABEL,
  reviewsHref,
  sortHref,
  type AdminReviewRow,
  type ReviewQuery,
  type ReviewStatus,
  type SortKey,
} from "@/lib/admin/review-query";
import { ReviewRowActions } from "@/components/admin/reviews/review-row-actions";

/**
 * The reviews table. Server-rendered: sorting is a link, so it works with a cold
 * cache and without JavaScript, and the row menu is the only client component.
 *
 * `formatDateShort` and `initialsOf` come from the users module — they are
 * table-formatting helpers, not user-specific ones, and duplicating them would
 * be how the two screens start rendering dates differently.
 */

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "reviewer_name", label: "Review" },
  { key: "property_name", label: "Property" },
  { key: "host_name", label: "Host" },
  { key: "rating", label: "Rating", numeric: true },
  { key: "review_date", label: "Date", numeric: true },
  { key: "status", label: "Status" },
];

function SortHeader({
  column,
  query,
}: {
  column: (typeof COLUMNS)[number];
  query: ReviewQuery;
}) {
  const active = query.sort === column.key;
  const Icon = !active ? ChevronsUpDown : query.dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={active ? (query.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        className="admin-th-sort"
        data-active={active || undefined}
        data-numeric={column.numeric || undefined}
        href={sortHref(query, column.key)}
        scroll={false}
      >
        {column.label}
        <Icon size={13} aria-hidden />
      </Link>
    </th>
  );
}

/** Rating as a number plus one star, so it stays readable in a dense row. */
function Rating({ value }: { value: number | null }) {
  if (value === null) {
    return (
      // Imported reviews predate ratings; an em dash is honest, "0" would not be.
      <span className="text-muted" title="This review has no rating">
        —
      </span>
    );
  }
  return (
    <span className="admin-rv-rating">
      <Star size={13} aria-hidden />
      {value}
    </span>
  );
}

export function ReviewsTable({
  rows,
  query,
}: {
  rows: AdminReviewRow[];
  query: ReviewQuery;
}) {
  return (
    <div className="card elev-sm admin-table-scroll">
      <table className="table">
        <caption className="sr-only">
          Reviews, sorted by {query.sort.replace("_", " ")}, {query.dir}ending
        </caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <SortHeader key={column.key} column={column} query={query} />
            ))}
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const place = [row.property_city, row.property_country]
              .filter(Boolean)
              .join(", ");
            return (
              <tr key={row.id}>
                <td>
                  <span className="admin-us-who">
                    <span className="admin-us-avatar" aria-hidden>
                      {row.reviewer_avatar_url ? (
                        /* Plain <img>: avatar_url is arbitrary remote content, so
                           next/image would need every host allow-listed, and a
                           36px avatar gains nothing from the optimizer. */
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.reviewer_avatar_url} alt="" loading="lazy" />
                      ) : (
                        initialsOf(row.reviewer_name)
                      )}
                    </span>
                    <span className="admin-cell-main">
                      <Link
                        className="admin-cell-link"
                        href={reviewsHref(query, { review: row.id })}
                        scroll={false}
                      >
                        {row.reviewer_name}
                      </Link>
                      <span className="text-muted admin-rv-excerpt">
                        {row.excerpt || "No comment"}
                      </span>
                    </span>
                  </span>
                </td>

                <td>
                  <span className="admin-cell-main">
                    {row.property_id ? (
                      <Link
                        className="admin-cell-link"
                        href={`/admin/properties/${row.property_id}`}
                      >
                        {row.property_name ?? "Untitled"}
                      </Link>
                    ) : (
                      // The property row is gone; the review survives it.
                      <span className="text-muted">Property removed</span>
                    )}
                    {place && <span className="text-muted">{place}</span>}
                  </span>
                </td>

                <td>{row.host_name ?? <span className="text-muted">—</span>}</td>

                <td data-numeric>
                  <Rating value={row.rating} />
                </td>

                <td data-numeric>{formatDateShort(row.review_date)}</td>

                <td>
                  <span className={`tag ${tagClassFor(row.status)}`}>
                    {STATUS_LABEL[row.status as ReviewStatus] ?? row.status}
                  </span>
                </td>

                <td>
                  <ReviewRowActions review={row} query={query} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
