"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { computeBookingBreakdown, formatMoney } from "@/lib/pricing";
import { validateCoupon } from "@/lib/coupons";
import { TripSummary } from "@/components/checkout/trip-summary";
import {
  GuestDetailsForm,
  guestDetailsValid,
} from "@/components/checkout/guest-details-form";
import { CouponField } from "@/components/checkout/coupon-field";
import { BookingSummaryCard } from "@/components/checkout/booking-summary-card";
import { ConfirmationView } from "@/components/checkout/confirmation-view";
import type {
  AppliedCoupon,
  CheckoutProperty,
  CheckoutTrip,
  CreateOrder,
  GuestDetails,
  VerifyPayment,
} from "@/components/checkout/checkout-types";
import { writeBookingDraft } from "@/lib/payments/booking-draft";

function guestsLabel(g: CheckoutTrip["guests"]): string {
  const people = g.adults + g.children;
  const parts = [`${people} guest${people === 1 ? "" : "s"}`];
  if (g.infants > 0) parts.push(`${g.infants} infant${g.infants === 1 ? "" : "s"}`);
  return parts.join(", ");
}

export function CheckoutClient({
  property,
  trip,
  editHref,
  createOrder,
  verifyPayment,
}: {
  property: CheckoutProperty;
  trip: CheckoutTrip;
  editHref: string;
  /** Razorpay: create an Order server-side (amount is priced there, not here) */
  createOrder: CreateOrder;
  /** Razorpay: verify the signature and persist the booking */
  verifyPayment: VerifyPayment;
}) {
  const router = useRouter();
  const [guest, setGuest] = useState<GuestDetails>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    bookingRef: string;
    total: number;
    provider: string;
  } | null>(null);

  const breakdown = useMemo(
    () =>
      computeBookingBreakdown({
        perNight: trip.perNight,
        nights: trip.nights,
        cleaningFee: trip.cleaningFee,
        currency: trip.currency,
        discount: applied?.discount ?? 0,
        couponCode: applied?.code ?? null,
      }),
    [trip, applied],
  );

  function applyCoupon(code: string) {
    const roomTotal = trip.perNight * trip.nights;
    const res = validateCoupon(code, roomTotal, trip.nights);
    if (!res.ok) {
      setApplied(null);
      setCouponError(res.error);
      return;
    }
    setApplied({ code: res.code, label: res.label, discount: res.discount });
    setCouponError(null);
  }

  /**
   * Continue to payment.
   *
   * The reservation step validates and hands off; the dedicated payment page
   * owns the Razorpay call. Guest details travel in sessionStorage rather than
   * the query string so a name, email and phone never end up in browser
   * history or server logs.
   */
  function handleSubmit() {
    setShowErrors(true);
    setServerError(null);
    // Card details are collected by Razorpay on the next step, so this page
    // only needs valid contact details and a real date range.
    if (!guestDetailsValid(guest) || trip.nights <= 0) {
      // Never fail silently: say why, and put the cursor on the problem.
      setServerError(
        trip.nights <= 0
          ? "Please choose valid dates before continuing."
          : "Please complete your contact details to continue.",
      );
      document
        .querySelector<HTMLInputElement>('section[aria-labelledby="guest-heading"] input')
        ?.focus();
      return;
    }

    setSubmitting(true);
    writeBookingDraft({
      propertyId: property.id,
      checkIn: trip.checkInISO,
      checkOut: trip.checkOutISO,
      adults: trip.guests.adults,
      children: trip.guests.children,
      infants: trip.guests.infants,
      guest,
      couponCode: applied?.code ?? null,
    });

    const qs = new URLSearchParams({
      in: trip.checkInISO,
      out: trip.checkOutISO,
      adults: String(trip.guests.adults),
    });
    if (trip.guests.children) qs.set("children", String(trip.guests.children));
    if (trip.guests.infants) qs.set("infants", String(trip.guests.infants));
    router.push(`/property/${property.id}/payment?${qs.toString()}`);
  }

  if (confirmed) {
    return (
      <ConfirmationView
        bookingRef={confirmed.bookingRef}
        property={property}
        trip={trip}
        total={confirmed.total}
        email={guest.email}
        guestsLabel={guestsLabel(trip.guests)}
        provider={confirmed.provider}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-10 lg:gap-16 items-start">
      {/* left: the form */}
      <div className="flex flex-col gap-10 order-2 lg:order-1">
        <TripSummary trip={trip} editHref={editHref} />
        <hr className="border-outline-variant/30" />

        <GuestDetailsForm value={guest} onChange={setGuest} showErrors={showErrors} />
        <hr className="border-outline-variant/30" />

        <section aria-labelledby="coupon-heading">
          <h2 id="coupon-heading" className="font-display text-xl md:text-2xl font-semibold text-primary mb-4">
            Have a coupon?
          </h2>
          <CouponField
            applied={applied}
            error={couponError}
            currency={trip.currency}
            onApply={applyCoupon}
            onRemove={() => {
              setApplied(null);
              setCouponError(null);
            }}
          />
        </section>
        <hr className="border-outline-variant/30" />


        {/* cancellation policy */}
        <div className="rounded-xl bg-surface-container-low/60 border border-outline-variant/30 p-4 flex gap-3">
          <ShieldCheck aria-hidden className="size-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-on-surface-variant">
            <span className="font-semibold text-on-surface">Free cancellation before check-in.</span>{" "}
            Get a full refund if you cancel at least 14 days before arrival. Review the full policy
            before you book.
          </p>
        </div>

        <div>
          {serverError && (
            <p className="text-sm text-destructive mb-3" role="alert">
              {serverError}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-xl cta-gradient text-white font-semibold shadow-lg active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 aria-hidden className="size-5 animate-spin" />}
            {submitting
              ? "Continuing…"
              : `Continue and pay ${formatMoney(breakdown.total, trip.currency)}`}
          </button>
          <p className="text-center text-xs text-on-surface-variant mt-3">
            You won’t be charged yet — you’ll confirm payment on the next step.
          </p>
        </div>
      </div>

      {/* right: summary */}
      <div className="order-1 lg:order-2">
        <BookingSummaryCard property={property} breakdown={breakdown} />
      </div>
    </div>
  );
}
