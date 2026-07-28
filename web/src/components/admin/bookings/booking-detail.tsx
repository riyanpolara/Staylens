import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ExternalLink, Star } from "lucide-react";
import { tagClassFor } from "@/lib/admin/types";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  initialsOf,
  type BookingDetail,
} from "@/lib/admin/bookings";
import { DetailShell } from "@/components/admin/bookings/detail-shell";
import {
  CancelBooking,
  PaymentControls,
  StatusControls,
} from "@/components/admin/bookings/booking-actions";

/**
 * Booking detail panel — guest, property, host, money and the write controls.
 *
 * A Server Component: everything is already on the server from
 * `admin_booking_detail`, and formatting here (rather than in the client)
 * keeps number/date rendering identical between the server pass and hydration.
 */

const TITLE_ID = "admin-bk-detail-title";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="admin-bk-row">
      <dt>{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}

function orDash(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

/** Shown when `?booking=` points at a row that no longer exists. */
export function BookingNotFound({ closeHref }: { closeHref: string }) {
  return (
    <DetailShell closeHref={closeHref} titleId={TITLE_ID}>
      <h2 id={TITLE_ID} className="dialog-title">
        Booking not found
      </h2>
      <p className="text-muted">
        This booking no longer exists, or the link is out of date.
      </p>
      <div className="dialog-actions">
        <Link href={closeHref} scroll={false} className="btn btn-primary">
          Back to bookings
        </Link>
      </div>
    </DetailShell>
  );
}

export function BookingDetailPanel({
  booking,
  closeHref,
}: {
  booking: BookingDetail;
  closeHref: string;
}) {
  const { guest, property, host } = booking;
  const guestName = guest.name ?? guest.email ?? "Unknown guest";
  const currency = booking.currency || "USD";

  // Prefer the stored line items; fall back to deriving the room total so the
  // breakdown still adds up on rows written before pricing was captured.
  const roomTotal =
    booking.nightly_price !== null
      ? booking.nightly_price * booking.nights
      : booking.total_price !== null && booking.cleaning_fee !== null
        ? booking.total_price - booking.cleaning_fee
        : null;

  return (
    <DetailShell closeHref={closeHref} titleId={TITLE_ID}>
      <header className="admin-bk-panel-head">
        <div>
          <p className="card-kicker">Booking</p>
          <h2 id={TITLE_ID} className="admin-bk-panel-title">
            {booking.reference}
          </h2>
          <p className="text-muted admin-bk-panel-sub">
            Created {formatDateTime(booking.created_at)}
          </p>
        </div>
        <div className="admin-bk-panel-tags">
          <span className={`tag ${tagClassFor(booking.status)}`}>{booking.status}</span>
          <span className={`tag ${tagClassFor(booking.payment_status)}`}>
            {booking.payment_status}
          </span>
        </div>
      </header>

      {booking.cancelled_at && (
        <section className="admin-bk-cancelled" role="note">
          <p className="admin-bk-cancelled-title">
            Cancelled {formatDateTime(booking.cancelled_at)}
            {booking.cancelled_by_name ? ` by ${booking.cancelled_by_name}` : ""}
          </p>
          <p className="text-muted">{booking.cancellation_reason ?? "No reason recorded."}</p>
        </section>
      )}

      <div className="admin-bk-panel-grid">
        {/* ── Stay ─────────────────────────────────────────────────── */}
        <section className="admin-bk-section">
          <h3 className="admin-bk-section-title">Stay</h3>
          <dl className="admin-bk-list">
            <Row label="Check-in" value={formatDate(booking.check_in)} />
            <Row label="Check-out" value={formatDate(booking.check_out)} />
            <Row
              label="Nights"
              value={<span className="admin-num">{booking.nights}</span>}
            />
            <Row label="Guests" value={<span className="admin-num">{booking.guests}</span>} />
            <Row label="Last updated" value={formatDateTime(booking.updated_at)} />
          </dl>
        </section>

        {/* ── Money ────────────────────────────────────────────────── */}
        <section className="admin-bk-section">
          <h3 className="admin-bk-section-title">Payment</h3>
          <dl className="admin-bk-list">
            <Row
              label={
                booking.nightly_price !== null
                  ? `${formatMoney(booking.nightly_price, currency)} × ${booking.nights} nights`
                  : "Accommodation"
              }
              value={<span className="admin-num">{formatMoney(roomTotal, currency)}</span>}
            />
            <Row
              label="Cleaning fee"
              value={
                <span className="admin-num">{formatMoney(booking.cleaning_fee, currency)}</span>
              }
            />
            <Row
              label="Platform commission"
              value={
                <span className="admin-num">{formatMoney(booking.commission, currency)}</span>
              }
            />
            <div className="admin-bk-row admin-bk-row-total">
              <dt>Total</dt>
              <dd className="admin-num">{formatMoney(booking.total_price, currency)}</dd>
            </div>
          </dl>
        </section>

        {/* ── Guest ────────────────────────────────────────────────── */}
        <section className="admin-bk-section">
          <h3 className="admin-bk-section-title">Guest</h3>
          <div className="admin-bk-person">
            <span className="admin-bk-avatar" aria-hidden>
              {initialsOf(guest.name, guest.email)}
            </span>
            <div className="admin-bk-person-id">
              <strong>{guestName}</strong>
              {guest.email && (
                <a href={`mailto:${guest.email}`} className="admin-bk-person-meta">
                  {guest.email}
                </a>
              )}
            </div>
          </div>
          <dl className="admin-bk-list">
            <Row label="Username" value={orDash(guest.username)} />
            <Row label="Member since" value={formatDate(guest.member_since)} />
            <Row
              label="Bookings"
              value={<span className="admin-num">{guest.booking_count}</span>}
            />
            <Row
              label="Lifetime value"
              value={
                <span className="admin-num">{formatMoney(guest.total_spend, currency)}</span>
              }
            />
          </dl>
        </section>

        {/* ── Property + host ──────────────────────────────────────── */}
        <section className="admin-bk-section">
          <h3 className="admin-bk-section-title">Property</h3>
          {property ? (
            <>
              {property.image_url && (
                /* a0.muscache.com is an allowed host in next.config.ts, so the
                   optimizer handles this. `fill` + a sized wrapper keeps the
                   slot from collapsing before the image loads. */
                <span className="admin-bk-property-image">
                  <Image
                    src={property.image_url}
                    alt=""
                    fill
                    sizes="(max-width: 720px) 100vw, 640px"
                    style={{ objectFit: "cover" }}
                  />
                </span>
              )}
              <p className="admin-bk-property-title">
                {property.title}
                {!property.is_active && (
                  <span className="tag tag-neutral admin-bk-inline-tag">inactive</span>
                )}
              </p>
              <p className="text-muted admin-bk-panel-sub">
                {[property.city, property.country].filter(Boolean).join(", ") || "Location unknown"}
              </p>

              <dl className="admin-bk-list">
                <Row
                  label="Type"
                  value={
                    [property.property_type, property.room_type].filter(Boolean).join(" · ") || "—"
                  }
                />
                <Row
                  label="Capacity"
                  value={
                    [
                      property.accommodates ? `${property.accommodates} guests` : null,
                      property.bedrooms !== null ? `${property.bedrooms} bd` : null,
                      property.beds !== null ? `${property.beds} beds` : null,
                      property.bathrooms !== null ? `${property.bathrooms} ba` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"
                  }
                />
                <Row
                  label="List price"
                  value={
                    <span className="admin-num">
                      {formatMoney(property.price, property.currency ?? currency)}
                      <span className="text-muted"> / night</span>
                    </span>
                  }
                />
                <Row
                  label="Rating"
                  value={
                    property.rating !== null ? (
                      <span className="admin-bk-rating admin-num">
                        <Star size={13} aria-hidden />
                        {property.rating}
                        <span className="text-muted"> ({property.review_count ?? 0})</span>
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Row label="Min nights" value={orDash(property.minimum_nights)} />
                <Row
                  label="Cancellation policy"
                  value={orDash(property.cancellation_policy?.replace(/_/g, " "))}
                />
              </dl>

              {property.listing_url && (
                <a
                  className="btn btn-ghost admin-bk-listing-link"
                  href={property.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open listing
                  <ExternalLink size={14} aria-hidden />
                </a>
              )}
            </>
          ) : (
            <p className="text-muted">This property has been removed.</p>
          )}

          {host && (
            <div className="admin-bk-host">
              <p className="card-kicker">Host</p>
              <div className="admin-bk-person">
                <span className="admin-bk-avatar" aria-hidden>
                  {initialsOf(host.name, null)}
                </span>
                <div className="admin-bk-person-id">
                  <strong>
                    {host.name ?? "Unknown host"}
                    {host.is_superhost && (
                      <span className="tag tag-accent-2 admin-bk-inline-tag">Superhost</span>
                    )}
                  </strong>
                  <span className="admin-bk-person-meta">
                    {[
                      host.location,
                      host.listings_count !== null ? `${host.listings_count} listings` : null,
                      host.response_rate !== null ? `${host.response_rate}% response` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                {host.identity_verified && (
                  <span className="admin-bk-verified" title="Identity verified">
                    <BadgeCheck size={16} aria-hidden />
                    <span className="sr-only">Identity verified</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Write controls ─────────────────────────────────────────── */}
      <section className="admin-bk-actions" aria-label="Booking actions">
        <StatusControls bookingId={booking.id} current={booking.status} />
        <PaymentControls bookingId={booking.id} current={booking.payment_status} />
        <CancelBooking
          bookingId={booking.id}
          reference={booking.reference}
          guestName={guestName}
          isPaid={booking.payment_status === "paid"}
          alreadyCancelled={booking.status === "cancelled"}
        />
      </section>
    </DetailShell>
  );
}
