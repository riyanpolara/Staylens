import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getProfile, getTrips, type Trip, type TripStatus } from "@/lib/profile";
import { ProfileTopNav } from "@/components/profile/profile-top-nav";
import { ProfileFooter } from "@/components/profile/profile-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { formatInr } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { CancelBooking } from "@/components/trips/cancel-booking";

/**
 * Travel log — every booking the signed-in guest has made, grouped by where the
 * stay sits relative to today. The proxy requires a session on /trips, so this
 * never renders for an anonymous visitor.
 */

export const metadata: Metadata = {
  title: "Your trips",
  robots: { index: false },
};

const DATE = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : DATE.format(d);
};

const STATUS_STYLE: Record<TripStatus, string> = {
  upcoming: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  current: "bg-primary text-white",
  completed: "bg-primary-container text-on-primary-container",
  cancelled: "bg-surface-container-highest text-on-surface-variant",
};

/** Sections in the order a guest cares about them. */
const GROUPS: { key: TripStatus; title: string }[] = [
  { key: "current", title: "Current" },
  { key: "upcoming", title: "Upcoming" },
  { key: "completed", title: "Completed" },
  { key: "cancelled", title: "Cancelled" },
];

/** Refund states as a guest reads them, not as the enum spells them. */
const REFUND_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed — contact support",
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-on-surface-variant">
        {label}
      </dt>
      <dd className="font-medium text-on-surface">{value}</dd>
    </div>
  );
}

/** Booking totals are stored in the currency they were charged in. */
function paidFmt(amount: number, currency: string): string {
  return currency === "INR" ? formatInr(amount) : `${amount} ${currency}`;
}

function TripCard({ trip, focused }: { trip: Trip; focused: boolean }) {
  const place = [trip.city, trip.country].filter(Boolean).join(", ");
  // Booking totals are stored in the currency they were charged in.
  const paid = trip.totalPaid === null ? "—" : paidFmt(trip.totalPaid, trip.currency);

  return (
    <li
      // The hash target a notification links to. `scroll-mt` clears the sticky
      // header so the card is not hidden underneath it on arrival.
      id={`booking-${trip.id}`}
      className={cn(
        "bg-white rounded-[20px] shadow-tinted overflow-hidden scroll-mt-28 transition-shadow",
        focused
          ? "border-2 border-primary ring-4 ring-primary/15"
          : "border border-outline-variant/10",
      )}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-56 h-44 sm:h-auto shrink-0 bg-surface-container">
          {trip.image && (
            <Image
              src={trip.image}
              alt={trip.propertyName}
              fill
              sizes="(max-width: 640px) 100vw, 224px"
              unoptimized
              className="object-cover"
            />
          )}
        </div>

        <div className="flex-1 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={`/property/${trip.propertyId}`}
                className="font-display text-lg font-semibold text-on-surface hover:underline"
              >
                {trip.propertyName}
              </Link>
              {place && (
                <p className="text-sm text-on-surface-variant mt-0.5">{place}</p>
              )}
            </div>
            <span
              className={cn(
                "shrink-0 px-3 py-1 rounded-full text-xs font-semibold capitalize",
                STATUS_STYLE[trip.status],
              )}
            >
              {trip.status}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <Detail label="Check-in" value={fmt(trip.checkIn)} />
            <Detail label="Check-out" value={fmt(trip.checkOut)} />
            <Detail
              label="Guests"
              value={`${trip.guests} ${trip.guests === 1 ? "guest" : "guests"}`}
            />
            <Detail label="Host" value={trip.hostName ?? "—"} />
            <Detail label="Booked" value={fmt(trip.bookedOn)} />
            <Detail label="Total paid" value={paid} />
            <Detail label="Payment" value={trip.paymentStatus ?? "—"} />
            <Detail label="Booking ID" value={trip.reference || "—"} />
          </dl>

          {/* Cancellation and refund, as labelled fields alongside the rest —
              a guest checking "did my money come back?" should not have to
              read a sentence to find out. */}
          {trip.status === "cancelled" && (
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm pt-4 border-t border-outline-variant/20">
              {trip.cancelledAt && (
                <Detail label="Cancelled on" value={fmt(trip.cancelledAt)} />
              )}
              {trip.refundAmount !== null && trip.refundAmount > 0 ? (
                <>
                  <Detail
                    label="Refund"
                    value={paidFmt(trip.refundAmount, trip.currency)}
                  />
                  <Detail
                    label="Refund status"
                    value={REFUND_LABEL[trip.refundStatus ?? ""] ?? "Pending"}
                  />
                </>
              ) : (
                <Detail label="Refund" value="None due" />
              )}
            </dl>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link
              href={`/property/${trip.propertyId}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View booking
            </Link>

            {/* Only while the stay is still ahead and not already cancelled —
                the same rule cancel_my_booking enforces, so the button is never
                offered and then refused. */}
            {trip.canCancel && (
              <CancelBooking
                bookingId={trip.id}
                propertyName={trip.propertyName}
              />
            )}

            {/* Reviews open only after checkout — there is nothing to review
                before the stay has happened. No review form exists yet, so the
                control is not rendered rather than shown as a dead link. */}
          </div>
        </div>
      </div>
    </li>
  );
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // `?booking=<id>` from a notification. Only used to highlight — the hash in
  // the same link is what scrolls, so this needs no client JavaScript.
  const focusedId =
    typeof sp.booking === "string" && sp.booking.length ? sp.booking : null;

  const [profile, trips] = await Promise.all([getProfile(), getTrips()]);
  const groups = GROUPS.map((g) => ({
    ...g,
    items: trips.filter((t) => t.status === g.key),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <ProfileTopNav
        avatarUrl={profile?.avatarUrl ?? ""}
        name={profile?.fullName ?? ""}
        email={profile?.email ?? ""}
      />
      <main id="main-content" className="max-w-[960px] mx-auto px-4 md:px-16 py-16">
        <h1 className="font-display text-3xl font-semibold text-on-surface mb-2">
          Your trips
        </h1>
        <p className="text-on-surface-variant mb-10">
          {trips.length
            ? `${trips.length} booking${trips.length === 1 ? "" : "s"}`
            : "Everything you book will appear here."}
        </p>

        {groups.length ? (
          <div className="space-y-12">
            {groups.map((g) => (
              <section key={g.key}>
                <h2 className="font-display text-xl font-semibold text-on-surface mb-4">
                  {g.title}
                  <span className="ml-2 text-sm font-normal text-on-surface-variant">
                    {g.items.length}
                  </span>
                </h2>
                <ul className="space-y-6">
                  {g.items.map((t) => (
                    <TripCard key={t.id} trip={t} focused={t.id === focusedId} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[20px] p-12 text-center shadow-tinted border border-outline-variant/10">
            <p className="font-display text-xl font-semibold text-on-surface">
              No trips yet
            </p>
            <p className="text-sm text-on-surface-variant mt-1">
              Book your first stay and your trips will appear here.
            </p>
            <Link
              href="/search"
              className="inline-block mt-6 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
            >
              Explore properties
            </Link>
          </div>
        )}
      </main>
      <ProfileFooter />
      <MobileNav active="Trips" />
    </>
  );
}
