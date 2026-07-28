import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { tagClassFor } from "@/lib/admin/types";
import {
  nextSortFor,
  propertyHref,
  type AdminPropertyRow,
  type PropertyQuery,
  type PropertySortKey,
} from "@/lib/admin/property-query";
import { PropertyRowActions } from "@/components/admin/properties/property-row-actions";
import { formatInr, formatPrice as formatInrPrice } from "@/lib/currency";

/**
 * The properties table. Server-rendered: sorting is a link, so it works with a
 * cold cache and without JavaScript, and the row menu is the only client
 * component on the screen.
 */

const COLUMNS: { key: PropertySortKey; label: string; numeric?: boolean }[] = [
  { key: "title", label: "Property" },
  { key: "host", label: "Host" },
  { key: "location", label: "Location" },
  { key: "price", label: "Price", numeric: true },
  { key: "rating", label: "Rating", numeric: true },
  { key: "bookings", label: "Bookings", numeric: true },
  { key: "status", label: "Status" },
];

function SortHeader({
  column,
  query,
}: {
  column: (typeof COLUMNS)[number];
  query: PropertyQuery;
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
        href={propertyHref(query, nextSortFor(query, column.key))}
        scroll={false}
      >
        {column.label}
        <Icon size={12} aria-hidden />
      </Link>
    </th>
  );
}

/**
 * Nightly rate for a listing row. Prices are stored in USD; the app displays
 * INR, so this defers to the shared currency module rather than keeping a
 * third local money formatter.
 */
function formatPrice(value: number, currency: string) {
  return (currency || "USD").trim().toUpperCase() === "USD"
    ? formatInrPrice(value)
    : formatInr(value);
}

export function PropertiesTable({
  rows,
  query,
}: {
  rows: AdminPropertyRow[];
  query: PropertyQuery;
}) {
  return (
    <div className="card elev-sm admin-table-scroll">
      <table className="table">
        <caption className="sr-only">Properties</caption>
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
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <span className="admin-cell-main">
                  <strong>
                    <Link className="admin-cell-link" href={`/admin/properties/${p.id}`}>
                      {p.title}
                    </Link>
                  </strong>
                  <span>
                    {p.type}
                    {p.is_featured ? " · Featured" : ""}
                  </span>
                </span>
              </td>
              <td>{p.host.name}</td>
              <td>
                {p.city}, {p.country}
              </td>
              <td className="admin-num">{formatPrice(p.price_per_night, p.currency)}</td>
              <td className="admin-num">
                {p.rating_avg != null ? `${p.rating_avg} (${p.review_count.toLocaleString()})` : "—"}
              </td>
              <td className="admin-num">{p.booking_count.toLocaleString()}</td>
              <td>
                <span className={`tag ${tagClassFor(p.status)}`}>{p.status}</span>
              </td>
              <td className="admin-actions-cell">
                <PropertyRowActions property={p} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
