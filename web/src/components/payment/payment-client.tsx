"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  ChevronRight,
  CircleAlert,
  Loader2,
  Lock,
  ShieldCheck,
  Star,
} from "lucide-react";
import { computeBookingBreakdown, formatMoney, nightsLabel } from "@/lib/pricing";
import { validateCoupon } from "@/lib/coupons";
import {
  loadRazorpayScript,
  openRazorpayCheckout,
} from "@/lib/payments/razorpay-checkout";
import {
  readBookingDraft,
  clearBookingDraft,
  type BookingDraft,
} from "@/lib/payments/booking-draft";
import type {
  CheckoutProperty,
  CheckoutTrip,
  CreateOrder,
  VerifyPayment,
} from "@/components/checkout/checkout-types";

type Phase =
  | { step: "loading" }
  | { step: "ready" }
  | { step: "paying" }
  | { step: "failed"; message: string }
  | { step: "done"; bookingRef: string; paymentId: string; total: number };

/**
 * Payment step (Claude Design handoff).
 *
 * Razorpay's hosted Checkout does the actual card entry, so this page's job is
 * to state clearly what is about to happen, take consent, and hand off. It
 * never renders a card form — card data must not pass through StayLens code.
 */
export function PaymentClient({
  property,
  trip,
  propertyHref,
  reservationHref,
  createOrder,
  verifyPayment,
}: {
  property: CheckoutProperty;
  trip: CheckoutTrip;
  propertyHref: string;
  reservationHref: string;
  createOrder: CreateOrder;
  verifyPayment: VerifyPayment;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [phase, setPhase] = useState<Phase>({ step: "loading" });
  const [agreed, setAgreed] = useState(false);
  const [showAgreeError, setShowAgreeError] = useState(false);

  // The reservation step hands the guest's details over in sessionStorage.
  // Arriving here directly (bookmark, refresh after clearing) means there is
  // nothing to pay for, so send the guest back to fill the form in.
  // sessionStorage does not exist during SSR, so this genuinely has to run
  // after mount — the "sync with an external store" case the rule allows. It
  // costs exactly one extra render, once, on a page that is about to open a
  // payment window.
  useEffect(() => {
    const d = readBookingDraft(property.id);
    if (!d) {
      router.replace(reservationHref);
      return;
    }
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       reading sessionStorage cannot happen during render (it does not exist on
       the server), so this is the sanctioned external-store sync. */
    setDraft(d);
    setPhase({ step: "ready" });
  }, [property.id, reservationHref, router]);

  const breakdown = useMemo(() => {
    const coupon = draft?.couponCode
      ? validateCoupon(draft.couponCode, trip.perNight * trip.nights, trip.nights)
      : null;
    return computeBookingBreakdown({
      perNight: trip.perNight,
      nights: trip.nights,
      cleaningFee: trip.cleaningFee,
      currency: trip.currency,
      discount: coupon?.ok ? coupon.discount : 0,
      couponCode: coupon?.ok ? coupon.code : null,
    });
  }, [draft, trip]);

  const guestsText = (() => {
    const people = trip.guests.adults + trip.guests.children;
    const parts = [`${people} guest${people === 1 ? "" : "s"}`];
    if (trip.guests.infants > 0)
      parts.push(`${trip.guests.infants} infant${trip.guests.infants === 1 ? "" : "s"}`);
    return parts.join(", ");
  })();

  async function pay() {
    if (!draft) return;
    if (!agreed) {
      setShowAgreeError(true);
      return;
    }
    setShowAgreeError(false);
    setPhase({ step: "paying" });

    const order = await createOrder(draft.booking);
    if (!order.ok) {
      setPhase({ step: "failed", message: order.error });
      return;
    }

    const ready = await loadRazorpayScript();
    if (!ready) {
      setPhase({
        step: "failed",
        message: "We couldn't load the payment window. Check your connection and try again.",
      });
      return;
    }

    const outcome = await openRazorpayCheckout({
      keyId: order.keyId,
      orderId: order.orderId,
      amountMinor: order.amountMinor,
      currency: order.currency,
      name: "StayLens",
      description: property.name,
      prefill: order.prefill,
      notes: { booking_ref: order.bookingRef, property_id: property.id },
    });

    if (outcome.status === "dismissed") {
      setPhase({ step: "ready" }); // closed the window — nothing happened
      return;
    }
    if (outcome.status === "failed") {
      setPhase({ step: "failed", message: `${outcome.error} You have not been charged.` });
      return;
    }

    const verified = await verifyPayment({
      razorpayOrderId: outcome.payload.razorpay_order_id,
      razorpayPaymentId: outcome.payload.razorpay_payment_id,
      razorpaySignature: outcome.payload.razorpay_signature,
      bookingRef: order.bookingRef,
      booking: draft.booking,
    });

    if (!verified.ok) {
      setPhase({ step: "failed", message: verified.error });
      return;
    }
    clearBookingDraft();
    setPhase({
      step: "done",
      bookingRef: verified.bookingRef,
      paymentId: outcome.payload.razorpay_payment_id,
      total: verified.total,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const busy = phase.step === "paying";

  /* ---------------- confirmed ---------------- */
  if (phase.step === "done") {
    return (
      <div className="max-w-[640px] mx-auto text-center">
        <span className="mx-auto mb-6 grid place-items-center w-16 h-16 rounded-full bg-primary-fixed">
          <BadgeCheck aria-hidden className="size-8 text-on-primary-fixed-variant" />
        </span>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface mb-2">
          Booking confirmed
        </h1>
        <p className="text-on-surface-variant mb-8">
          A receipt and your host&apos;s details are on the way to your email.
        </p>

        <dl className="text-left bg-surface-container-lowest border border-outline-variant/30 rounded-2xl divide-y divide-outline-variant/20 shadow-tinted">
          {[
            ["Booking ID", phase.bookingRef],
            ["Payment ID", phase.paymentId],
            ["Property", property.name],
            [
              "Dates",
              `${trip.checkInLabel} → ${trip.checkOutLabel} · ${trip.nights} night${trip.nights === 1 ? "" : "s"}`,
            ],
            ["Guests", guestsText],
            ["Amount paid", formatMoney(phase.total, "INR")],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-6 px-5 py-4">
              <dt className="text-sm text-on-surface-variant shrink-0">{k}</dt>
              <dd className="text-sm font-semibold text-on-surface text-right break-all">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/profile/edit" className="btn-outline">
            View my bookings
          </Link>
          <Link href="/" className="btn-outline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------- payment / failed ---------------- */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] gap-8 lg:gap-14 items-start">
      {/* ---- left: the payment panel ---- */}
      <div className="order-2 lg:order-1">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-on-surface-variant">
            <li>
              <Link href={propertyHref} className="hover:text-primary">Property</Link>
            </li>
            <ChevronRight aria-hidden className="size-3.5" />
            <li>
              <Link href={reservationHref} className="hover:text-primary">Reservation</Link>
            </li>
            <ChevronRight aria-hidden className="size-3.5" />
            <li aria-current="page" className="font-semibold text-on-surface">Payment</li>
          </ol>
        </nav>

        {phase.step === "failed" ? (
          <section
            role="alert"
            className="bg-surface-container-lowest border-2 border-destructive/40 rounded-2xl p-6 md:p-8 shadow-tinted"
          >
            <span className="grid place-items-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
              <CircleAlert aria-hidden className="size-6 text-destructive" />
            </span>
            <h1 className="font-display text-2xl font-bold text-on-surface mb-2">
              Payment failed
            </h1>
            <p className="text-on-surface-variant mb-6">{phase.message}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setPhase({ step: "ready" })} className="btn-primary-lg">
                Try again
              </button>
              <Link href={reservationHref} className="btn-outline">
                Back to reservation
              </Link>
            </div>
          </section>
        ) : (
          <>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface mb-2">
              Secure checkout
            </h1>
            <p className="text-on-surface-variant mb-6">
              Your payment is encrypted and securely processed by Razorpay.
            </p>

            <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 md:p-8 shadow-tinted">
              <p className="text-sm text-on-surface-variant mb-6">
                You&apos;ll be redirected to Razorpay&apos;s secure payment window to complete
                your payment. Staylens never sees or stores your card details.
              </p>

              <ul className="grid gap-4 mb-6">
                {[
                  { Icon: Lock, title: "Secure payments", note: "UPI · Cards · Net Banking · Wallets" },
                  { Icon: BadgeCheck, title: "Instant booking confirmation", note: null },
                  { Icon: ShieldCheck, title: "100% encrypted checkout", note: null },
                ].map(({ Icon, title, note }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="grid place-items-center w-9 h-9 rounded-full bg-primary-fixed/50 shrink-0">
                      <Icon aria-hidden className="size-4 text-on-primary-fixed-variant" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-on-surface">{title}</span>
                      {note && <span className="block text-xs text-on-surface-variant">{note}</span>}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-on-surface-variant flex items-center gap-2">
                Powered by <strong className="text-on-surface">Razorpay</strong>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-[11px] font-semibold">
                  Test mode
                </span>
              </p>
            </section>

            <section className="mt-6 bg-surface-container-low/60 border border-outline-variant/30 rounded-2xl p-5">
              <p className="text-sm font-semibold text-on-surface mb-1">
                Free cancellation before check-in.
              </p>
              <p className="text-xs text-on-surface-variant">
                Get a full refund if you cancel at least 14 days before arrival. Refunds are
                returned to the source account within 5–7 working days.
              </p>
            </section>

            <label className="flex items-start gap-3 mt-6 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  if (e.target.checked) setShowAgreeError(false);
                }}
                className="mt-1 size-4 accent-primary shrink-0"
                aria-describedby={showAgreeError ? "agree-error" : undefined}
              />
              <span className="text-sm text-on-surface-variant">
                I agree to the <a href="#" className="text-primary underline">Terms &amp; Conditions</a>,
                the <a href="#" className="text-primary underline">Privacy Policy</a> and the{" "}
                <a href="#" className="text-primary underline">Cancellation Policy</a>.
              </span>
            </label>
            {showAgreeError && (
              <p id="agree-error" className="mt-2 text-sm font-medium text-destructive">
                Please accept the terms to continue.
              </p>
            )}

            <button
              type="button"
              onClick={pay}
              disabled={busy || phase.step === "loading"}
              className="cta-gradient w-full h-14 mt-6 rounded-[14px] text-white font-semibold flex items-center justify-center gap-2 shadow-tinted disabled:opacity-70 transition-opacity"
            >
              {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
              {busy ? "Opening payment…" : `Pay ${formatMoney(breakdown.total, trip.currency)}`}
            </button>
            <p className="mt-3 text-center text-xs text-on-surface-variant">
              You won&apos;t be charged until you confirm in the Razorpay window.
            </p>
            <p className="mt-4 text-center">
              <Link href={reservationHref} className="text-sm text-primary font-semibold hover:underline">
                Back to reservation
              </Link>
            </p>
          </>
        )}
      </div>

      {/* ---- right: reservation summary ---- */}
      <aside className="order-1 lg:order-2 lg:sticky lg:top-24">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 shadow-tinted">
          <div className="flex gap-4">
            {property.image && (
              <Image
                src={property.image}
                alt=""
                width={104}
                height={96}
                unoptimized={property.image.includes("muscache")}
                className="w-[104px] h-24 rounded-xl object-cover shrink-0"
              />
            )}
            <div className="min-w-0">
              {property.propertyType && (
                <p className="text-[11px] uppercase tracking-wide text-on-surface-variant">
                  {property.propertyType}
                </p>
              )}
              <p className="font-semibold text-on-surface line-clamp-2 text-sm">{property.name}</p>
              <p className="text-xs text-on-surface-variant line-clamp-1">{property.location}</p>
              <p className="flex items-center gap-1 text-xs mt-1">
                <Star aria-hidden className="size-3.5 text-primary fill-primary" />
                <strong>{property.rating.toFixed(2)}</strong>
                <span className="text-on-surface-variant">· {property.reviewsCount} reviews</span>
              </p>
            </div>
          </div>

          <hr className="my-5 border-outline-variant/30" />

          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-on-surface-variant">Check-in</dt>
            <dd className="text-right font-medium">{trip.checkInLabel}</dd>
            <dt className="text-on-surface-variant">Check-out</dt>
            <dd className="text-right font-medium">{trip.checkOutLabel}</dd>
            <dt className="text-on-surface-variant">Guests</dt>
            <dd className="text-right font-medium">{guestsText}</dd>
            <dt className="text-on-surface-variant">Nights</dt>
            <dd className="text-right font-medium">
              {trip.nights} night{trip.nights === 1 ? "" : "s"}
            </dd>
          </dl>

          <hr className="my-5 border-outline-variant/30" />

          <p className="font-semibold text-on-surface mb-3">Price details</p>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-on-surface-variant">
              {formatMoney(trip.perNight, trip.currency)} × {nightsLabel(trip.nights).replace("for ", "")}
            </dt>
            <dd className="text-right">{formatMoney(breakdown.roomTotal, trip.currency)}</dd>

            {breakdown.cleaningFee > 0 && (
              <>
                <dt className="text-on-surface-variant">Cleaning fee</dt>
                <dd className="text-right">{formatMoney(breakdown.cleaningFee, trip.currency)}</dd>
              </>
            )}
            <dt className="text-on-surface-variant">Staylens service fee</dt>
            <dd className="text-right">{formatMoney(breakdown.serviceFee, trip.currency)}</dd>
            <dt className="text-on-surface-variant">Taxes</dt>
            <dd className="text-right">{formatMoney(breakdown.taxes, trip.currency)}</dd>

            {breakdown.discount > 0 && (
              <>
                <dt className="text-primary">
                  {breakdown.couponCode ? `Coupon ${breakdown.couponCode}` : "Discount"}
                </dt>
                <dd className="text-right text-primary">
                  −{formatMoney(breakdown.discount, trip.currency)}
                </dd>
              </>
            )}
          </dl>

          <hr className="my-4 border-outline-variant/30" />
          <div className="flex items-center justify-between font-bold text-on-surface">
            <span>Total</span>
            <span>{formatMoney(breakdown.total, trip.currency)}</span>
          </div>

          <p className="mt-4 text-[11px] text-on-surface-variant">
            Prices include all fees and taxes.
          </p>
          <p className="mt-3 text-center">
            <Link href={reservationHref} className="text-sm text-primary font-semibold hover:underline">
              Edit reservation
            </Link>
          </p>
        </div>
      </aside>
    </div>
  );
}
