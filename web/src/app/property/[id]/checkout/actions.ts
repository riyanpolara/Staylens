"use server";

import { getPropertyDetail } from "@/lib/queries";
import { computeBookingBreakdown } from "@/lib/pricing";
import { validateCoupon } from "@/lib/coupons";
import { createPaymentIntent } from "@/lib/payments/provider";
import { nightsBetween, parseISODate } from "@/lib/calendar";
import { isValidEmail } from "@/lib/validation";
import type {
  BookingInput,
  BookingResult,
} from "@/components/checkout/checkout-types";

/**
 * Confirm a booking. The price is recomputed here from authoritative data —
 * the client's numbers are never trusted. A PaymentIntent is created via the
 * provider boundary (mock today, Stripe when configured). No DB write and no
 * real charge in this preview; a confirmation reference is returned.
 */
export async function submitBooking(input: BookingInput): Promise<BookingResult> {
  const property = await getPropertyDetail(input.propertyId).catch(() => null);
  if (!property) return { ok: false, error: "This stay is no longer available." };

  const nights = nightsBetween(parseISODate(input.checkIn), parseISODate(input.checkOut));
  if (nights <= 0) return { ok: false, error: "Please choose valid dates." };

  const { firstName, lastName, email } = input.guest;
  if (!firstName?.trim() || !lastName?.trim() || !isValidEmail(email ?? "")) {
    return { ok: false, error: "Please complete your contact details." };
  }

  // coupon re-validated server-side against the authoritative room subtotal
  let discount = 0;
  let couponCode: string | null = null;
  if (input.couponCode?.trim()) {
    const res = validateCoupon(input.couponCode, property.price * nights, nights);
    if (!res.ok) return { ok: false, error: res.error };
    discount = res.discount;
    couponCode = res.code;
  }

  const breakdown = computeBookingBreakdown({
    perNight: property.price,
    nights,
    cleaningFee: property.cleaningFee,
    currency: property.currency,
    discount,
    couponCode,
  });

  const intent = await createPaymentIntent({
    amount: Math.round(breakdown.total * 100), // minor units
    currency: (property.currency ?? "usd").toLowerCase(),
    metadata: {
      propertyId: property.id,
      nights: String(nights),
      guests: String(input.adults + input.children),
    },
  });

  // In real Stripe the client would now confirm `intent.clientSecret` with the
  // card via Elements. Here we treat intent creation as success.
  const bookingRef = `SL-${randomRef()}`;
  return {
    ok: true,
    bookingRef,
    intentId: intent.id,
    provider: intent.provider,
    total: breakdown.total,
    currency: breakdown.currency,
  };
}

function randomRef(): string {
  return Array.from({ length: 6 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32)),
  ).join("");
}
