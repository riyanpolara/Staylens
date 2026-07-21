"use client";

import { useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { computeBookingBreakdown, formatMoney } from "@/lib/pricing";
import { validateCoupon } from "@/lib/coupons";
import { TripSummary } from "@/components/checkout/trip-summary";
import {
  GuestDetailsForm,
  guestDetailsValid,
} from "@/components/checkout/guest-details-form";
import { CouponField } from "@/components/checkout/coupon-field";
import { PaymentSection } from "@/components/checkout/payment-section";
import { BookingSummaryCard } from "@/components/checkout/booking-summary-card";
import { ConfirmationView } from "@/components/checkout/confirmation-view";
import type {
  AppliedCoupon,
  CheckoutProperty,
  CheckoutTrip,
  GuestDetails,
  SubmitBooking,
} from "@/components/checkout/checkout-types";

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
  submit,
}: {
  property: CheckoutProperty;
  trip: CheckoutTrip;
  editHref: string;
  /** server action injected from the route (Stripe-ready boundary) */
  submit: SubmitBooking;
}) {
  const [guest, setGuest] = useState<GuestDetails>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [paymentValid, setPaymentValid] = useState(false);
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

  async function handleSubmit() {
    setShowErrors(true);
    setServerError(null);
    if (!guestDetailsValid(guest) || !paymentValid || trip.nights <= 0) return;

    setSubmitting(true);
    const res = await submit({
      propertyId: property.id,
      checkIn: trip.checkInISO,
      checkOut: trip.checkOutISO,
      adults: trip.guests.adults,
      children: trip.guests.children,
      infants: trip.guests.infants,
      guest,
      couponCode: applied?.code ?? null,
    });
    setSubmitting(false);

    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    setConfirmed({ bookingRef: res.bookingRef, total: res.total, provider: res.provider });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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

        <PaymentSection onValidChange={setPaymentValid} disabled={submitting} />

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
              ? "Confirming…"
              : `Confirm and pay ${formatMoney(breakdown.total, trip.currency)}`}
          </button>
          <p className="text-center text-xs text-on-surface-variant mt-3">
            You won’t be charged — this is a preview checkout.
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
