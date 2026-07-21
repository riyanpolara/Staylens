import Link from "next/link";
import { CalendarRange, Users } from "lucide-react";
import type { CheckoutTrip } from "@/components/checkout/checkout-types";

function guestsLabel(g: CheckoutTrip["guests"]): string {
  const people = g.adults + g.children;
  const parts = [`${people} guest${people === 1 ? "" : "s"}`];
  if (g.infants > 0) parts.push(`${g.infants} infant${g.infants === 1 ? "" : "s"}`);
  return parts.join(", ");
}

/** "Your trip" — dates + guests, each editable back on the property page. */
export function TripSummary({ trip, editHref }: { trip: CheckoutTrip; editHref: string }) {
  return (
    <section aria-labelledby="trip-heading">
      <h2 id="trip-heading" className="font-display text-xl md:text-2xl font-semibold text-primary mb-5">
        Your trip
      </h2>
      <dl className="space-y-4">
        <Row
          icon={<CalendarRange aria-hidden className="size-5 text-primary" />}
          term="Dates"
          detail={`${trip.checkInLabel} – ${trip.checkOutLabel}`}
          editHref={`${editHref}#booking-card`}
          editLabel="Edit dates"
        />
        <Row
          icon={<Users aria-hidden className="size-5 text-primary" />}
          term="Guests"
          detail={guestsLabel(trip.guests)}
          editHref={`${editHref}#booking-card`}
          editLabel="Edit guests"
        />
      </dl>
    </section>
  );
}

function Row({
  icon,
  term,
  detail,
  editHref,
  editLabel,
}: {
  icon: React.ReactNode;
  term: string;
  detail: string;
  editHref: string;
  editLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {term}
          </dt>
          <dd className="text-on-surface font-medium">{detail}</dd>
        </div>
      </div>
      <Link
        href={editHref}
        className="text-sm font-semibold underline underline-offset-4 hover:text-primary shrink-0"
      >
        {editLabel}
      </Link>
    </div>
  );
}
