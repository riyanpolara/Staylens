import Image from "next/image";
import Link from "next/link";
import { CalendarRange, CheckCircle2, MailCheck, Users } from "lucide-react";
import { formatMoney } from "@/lib/pricing";
import type { CheckoutProperty, CheckoutTrip } from "@/components/checkout/checkout-types";

/** Post-payment confirmation (mock). Shows the booking reference + next steps. */
export function ConfirmationView({
  bookingRef,
  property,
  trip,
  total,
  email,
  guestsLabel,
  provider,
}: {
  bookingRef: string;
  property: CheckoutProperty;
  trip: CheckoutTrip;
  total: number;
  email: string;
  guestsLabel: string;
  provider: string;
}) {
  return (
    <div className="max-w-[640px] mx-auto text-center">
      <div className="w-16 h-16 rounded-full bg-primary-fixed/40 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 aria-hidden className="size-9 text-primary" />
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-2">
        You’re all set!
      </h1>
      <p className="text-on-surface-variant mb-1">
        Your stay at <span className="font-semibold text-on-surface">{property.name}</span> is
        confirmed.
      </p>
      <p className="inline-flex items-center gap-2 text-sm text-on-surface-variant mb-8">
        <MailCheck aria-hidden className="size-4 text-primary" />
        A confirmation would be emailed to <span className="font-semibold">{email}</span>.
      </p>

      <div className="rounded-[20px] border border-outline-variant/30 bg-surface-container-lowest shadow-tinted overflow-hidden text-left">
        <div className="flex items-center gap-4 p-5 border-b border-outline-variant/30">
          <div className="relative w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-surface-container">
            {property.image && (
              <Image
                src={property.image}
                alt={property.name}
                fill
                sizes="80px"
                unoptimized={property.image.includes("muscache")}
                className="object-cover"
              />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-on-surface line-clamp-1">{property.name}</h2>
            <p className="text-sm text-on-surface-variant line-clamp-1">{property.location}</p>
          </div>
        </div>

        <dl className="p-5 grid grid-cols-2 gap-4 text-sm">
          <Item icon={<CalendarRange className="size-4 text-primary" />} term="Dates" detail={`${trip.checkInLabel} – ${trip.checkOutLabel}`} />
          <Item icon={<Users className="size-4 text-primary" />} term="Guests" detail={guestsLabel} />
          <div className="col-span-2 flex items-center justify-between pt-3 border-t border-outline-variant/30">
            <span>
              <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Confirmation code
              </dt>
              <dd className="font-mono font-bold text-on-surface tracking-wider">{bookingRef}</dd>
            </span>
            <span className="text-right">
              <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Total paid
              </dt>
              <dd className="font-display text-lg font-semibold text-primary">
                {formatMoney(total, trip.currency)}
              </dd>
            </span>
          </div>
        </dl>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Link
          href={`/property/${property.id}/contact`}
          className="flex-1 inline-flex justify-center items-center py-3.5 rounded-xl cta-gradient text-white font-semibold active:scale-95 transition-transform"
        >
          Message your host
        </Link>
        <Link
          href="/"
          className="flex-1 inline-flex justify-center items-center py-3.5 rounded-xl border-[1.5px] border-primary text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Back to home
        </Link>
      </div>

      <p className="text-[11px] text-on-surface-variant/70 mt-6">
        Preview booking · payment provider: {provider} · no real charge was made.
      </p>
    </div>
  );
}

function Item({
  icon,
  term,
  detail,
}: {
  icon: React.ReactNode;
  term: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <span>
        <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          {term}
        </dt>
        <dd className="text-on-surface font-medium">{detail}</dd>
      </span>
    </div>
  );
}
