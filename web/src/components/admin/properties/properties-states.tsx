import Link from "next/link";
import { SearchX, TriangleAlert } from "lucide-react";
import { RetryButton } from "@/components/admin/retry-button";

/**
 * Loading / empty / error surfaces for the properties table.
 *
 * Per the handoff spec: the skeleton uses the real radii and the real column
 * widths so nothing shifts when data lands; the empty state offers the
 * filter-clearing action; the error state names the resource that failed and
 * offers a retry.
 */

export function PropertiesTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="card elev-sm admin-table-scroll" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading properties…</span>
      <table className="table" aria-hidden>
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">Host</th>
            <th scope="col">Location</th>
            <th scope="col">Price</th>
            <th scope="col">Rating</th>
            <th scope="col">Bookings</th>
            <th scope="col">Status</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}>
              <td>
                <span className="admin-cell-main">
                  <span className="admin-skeleton" style={{ width: "62%" }} />
                  <span className="admin-skeleton admin-skeleton-sm" style={{ width: "38%" }} />
                </span>
              </td>
              <td><span className="admin-skeleton" style={{ width: "70%" }} /></td>
              <td><span className="admin-skeleton" style={{ width: "80%" }} /></td>
              <td><span className="admin-skeleton" style={{ width: 52 }} /></td>
              <td><span className="admin-skeleton" style={{ width: 68 }} /></td>
              <td><span className="admin-skeleton" style={{ width: 32 }} /></td>
              <td><span className="admin-skeleton admin-skeleton-tag" style={{ width: 62 }} /></td>
              <td><span className="admin-skeleton admin-skeleton-icon" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PropertiesEmpty({ filtered }: { filtered: boolean }) {
  return (
    <div className="card elev-sm admin-empty">
      <span className="admin-empty-icon" aria-hidden>
        <SearchX size={26} />
      </span>
      <h2 className="card-title">{filtered ? "No properties match" : "No properties yet"}</h2>
      <p className="text-muted">
        {filtered
          ? "Try a different search term, or clear the filters to see the full inventory."
          : "Listings will appear here as soon as the catalog has its first property."}
      </p>
      {filtered && (
        <Link className="btn btn-primary" href="/admin/properties">
          Clear filters
        </Link>
      )}
    </div>
  );
}

export function PropertiesError({ message }: { message: string }) {
  return (
    <div className="card elev-sm admin-empty" role="alert">
      <span className="admin-empty-icon admin-empty-icon-warn" aria-hidden>
        <TriangleAlert size={26} />
      </span>
      <h2 className="card-title">Could not load properties</h2>
      <p className="text-muted">{message}</p>
      <RetryButton />
    </div>
  );
}
