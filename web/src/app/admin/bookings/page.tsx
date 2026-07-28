import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { MetricCard } from "@/components/admin/ui";
import { tagClassFor } from "@/lib/admin/types";
import {
  bookingsHref,
  formatDateShort,
  formatMoney,
  getBookingDetail,
  getBookings,
  hasActiveFilters,
  initialsOf,
  parseBookingQuery,
  sortHref,
  type BookingQuery,
  type SearchParams,
  type SortKey,
} from "@/lib/admin/bookings";
import { FiltersBar } from "@/components/admin/bookings/filters-bar";
import { Pagination } from "@/components/admin/bookings/pagination";
import {
  BookingDetailPanel,
  BookingNotFound,
} from "@/components/admin/bookings/booking-detail";
import {
  BookingsError,
  NoBookingsYet,
  NoMatches,
} from "@/components/admin/bookings/states";
import "./bookings.css";

/**
 * Bookings — the operations screen for reservations.
 *
 * A Server Component that reads its entire state from the URL and answers it
 * with one `admin_bookings_list()` call. Nothing about the list is held in
 * client state, so what is on screen and what the address bar says can never
 * disagree, and every view is a link an operator can paste to a colleague.
 */

export const metadata = { title: "Bookings" };

/** Filters and paging are request-time state; there is nothing to prerender. */
export const dynamic = "force-dynamic";

function SortableHeader({
  query,
  column,
  label,
  align,
}: {
  query: BookingQuery;
  column: SortKey;
  label: string;
  align?: "end";
}) {
  const active = query.sort === column;
  const Arrow = query.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" data-align={align}>
      <Link
        href={sortHref(query, column)}
        scroll={false}
        className="admin-bk-sort"
        data-active={active || undefined}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {active && <Arrow size={13} aria-hidden />}
      </Link>
    </th>
  );
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const query = parseBookingQuery(sp);
  const openId = (Array.isArray(sp.booking) ? sp.booking[0] : sp.booking)?.trim() || null;

  const [list, detail] = await Promise.all([
    getBookings(query),
    openId ? getBookingDetail(openId) : Promise.resolve(null),
  ]);

  if (!list.ok) {
    return <BookingsError reason={list.reason} message={list.message} />;
  }

  const { rows, total, page, page_count, page_size, metrics } = list.data;
  const filtered = hasActiveFilters(query);
  const closeHref = bookingsHref(query);

  return (
    <>
      <section className="admin-section admin-grid admin-grid-kpi" aria-label="Booking metrics">
        <MetricCard label="Bookings today" value={metrics.bookings_today.toLocaleString()} />
        <MetricCard label="Check-ins this week" value={metrics.checkins_week.toLocaleString()} />
        <MetricCard
          label="Cancellation rate"
          value={metrics.cancellation_rate === null ? "—" : `${metrics.cancellation_rate}%`}
        />
        <MetricCard
          label="Avg booking value"
          value={metrics.avg_booking_value === null ? "—" : formatMoney(metrics.avg_booking_value)}
        />
        <MetricCard label="Awaiting payment" value={metrics.pending_payments.toLocaleString()} />
      </section>

      <section className="admin-rise" aria-label="Bookings">
        <FiltersBar query={query} />

        {rows.length === 0 ? (
          filtered ? (
            <NoMatches clearHref="/admin/bookings" />
          ) : (
            <NoBookingsYet />
          )
        ) : (
          <div className="card elev-sm admin-table-scroll">
            <table className="table admin-bk-table">
              <caption className="sr-only">
                Bookings, page {page} of {page_count}
              </caption>
              <thead>
                <tr>
                  <SortableHeader query={query} column="reference" label="Reference" />
                  <SortableHeader query={query} column="guest" label="Guest" />
                  <SortableHeader query={query} column="property" label="Property" />
                  <SortableHeader query={query} column="check_in" label="Dates" />
                  <SortableHeader query={query} column="nights" label="Nights" align="end" />
                  <SortableHeader query={query} column="total_price" label="Total" align="end" />
                  <SortableHeader query={query} column="payment" label="Payment" />
                  <SortableHeader query={query} column="status" label="Status" />
                  <th scope="col">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const href = bookingsHref(query, { page, booking: b.id });
                  const guestName = b.guest.name ?? b.guest.email ?? "Unknown guest";
                  return (
                    <tr key={b.id}>
                      <td>
                        <Link href={href} scroll={false} className="admin-bk-ref">
                          {b.reference}
                        </Link>
                      </td>
                      <td>
                        <span className="admin-bk-guest">
                          <span className="admin-bk-avatar admin-bk-avatar-sm" aria-hidden>
                            {initialsOf(b.guest.name, b.guest.email)}
                          </span>
                          <span className="admin-cell-main">
                            <strong>{guestName}</strong>
                            {b.guest.email && <span>{b.guest.email}</span>}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="admin-cell-main admin-bk-property-cell">
                          <strong title={b.property.title}>{b.property.title}</strong>
                          <span>
                            {[b.property.city, b.host.name && `Host · ${b.host.name}`]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="admin-cell-main">
                          <strong className="admin-num">
                            {formatDateShort(b.check_in)} → {formatDateShort(b.check_out)}
                          </strong>
                          <span>
                            {b.guests} {b.guests === 1 ? "guest" : "guests"}
                          </span>
                        </span>
                      </td>
                      <td className="admin-num" data-align="end">
                        {b.nights}
                      </td>
                      <td className="admin-num" data-align="end">
                        {formatMoney(b.total_price, b.currency)}
                      </td>
                      <td>
                        <span className={`tag ${tagClassFor(b.payment_status)}`}>
                          {b.payment_status}
                        </span>
                      </td>
                      <td>
                        <span className={`tag ${tagClassFor(b.status)}`}>{b.status}</span>
                      </td>
                      <td>
                        <Link
                          href={href}
                          scroll={false}
                          className="btn btn-ghost admin-bk-view"
                          aria-label={`View booking ${b.reference}`}
                        >
                          View
                          <ChevronRight size={14} aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          query={query}
          page={page}
          pageCount={page_count}
          total={total}
          pageSize={page_size}
          rowsOnPage={rows.length}
        />
      </section>

      {openId &&
        detail &&
        (detail.ok ? (
          detail.data ? (
            <BookingDetailPanel booking={detail.data} closeHref={closeHref} />
          ) : (
            <BookingNotFound closeHref={closeHref} />
          )
        ) : (
          <BookingNotFound closeHref={closeHref} />
        ))}
    </>
  );
}
