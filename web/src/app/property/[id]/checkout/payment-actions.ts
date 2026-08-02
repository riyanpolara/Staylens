"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyDetail } from "@/lib/queries";
import { computeBookingBreakdown, SERVICE_RATE } from "@/lib/pricing";
import { validateCoupon } from "@/lib/coupons";
import { convertFromUsd, DISPLAY_CURRENCY, formatInr } from "@/lib/currency";
import { raiseNotification } from "@/lib/notifications";
import { nightsBetween, parseISODate } from "@/lib/calendar";
import { isValidEmail } from "@/lib/validation";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayConfig,
  verifyPaymentSignature,
} from "@/lib/payments/razorpay";
import type {
  BookingInput,
  CreateOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "@/components/checkout/checkout-types";

/**
 * Razorpay integration, server side.
 *
 * Two actions, matching Razorpay's recommended flow:
 *
 *   createBookingOrder()      → validates, prices, creates an Order
 *   verifyAndCreateBooking()  → verifies the signature, THEN writes the booking
 *
 * The split exists for a reason: a booking row is only ever created after a
 * signature has been cryptographically verified against the key secret. The
 * browser's "payment succeeded" callback is attacker-controlled and proves
 * nothing on its own.
 */

/** Recomputes the authoritative price. Client numbers are never trusted. */
async function priceBooking(input: BookingInput) {
  const property = await getPropertyDetail(input.propertyId).catch(() => null);
  if (!property) return { ok: false as const, error: "This stay is no longer available." };

  const nights = nightsBetween(parseISODate(input.checkIn), parseISODate(input.checkOut));
  if (nights <= 0) return { ok: false as const, error: "Please choose valid dates." };

  let discount = 0;
  let couponCode: string | null = null;
  if (input.couponCode?.trim()) {
    const res = validateCoupon(input.couponCode, property.price * nights, nights);
    if (!res.ok) return { ok: false as const, error: res.error };
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

  // Catalogue prices are USD; the storefront quotes INR and Razorpay settles in
  // INR, so the charge is the INR figure the guest actually saw.
  const amountInr = Math.round(convertFromUsd(breakdown.total));
  return {
    ok: true as const,
    property,
    nights,
    breakdown,
    amountInr,
    amountMinor: amountInr * 100, // paise
  };
}

function bookingRef(): string {
  return `SL-${Array.from({ length: 6 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32)),
  ).join("")}`;
}

/* ------------------------------------------------------------------ *
 *  1. Create order
 * ------------------------------------------------------------------ */

export async function createBookingOrder(
  input: BookingInput,
): Promise<CreateOrderResult> {
  // --- the four validations the flow requires ------------------------------
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in to complete your booking." };
  }

  const { firstName, lastName, email } = input.guest;
  if (!firstName?.trim() || !lastName?.trim() || !isValidEmail(email ?? "")) {
    return { ok: false, error: "Please complete your contact details." };
  }

  const priced = await priceBooking(input); // property exists + dates + amount
  if (!priced.ok) return { ok: false, error: priced.error };

  const cfg = getRazorpayConfig();
  if (!cfg) {
    return {
      ok: false,
      error:
        "Payments aren't configured on this environment. Set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    };
  }

  const ref = bookingRef();
  const order = await createRazorpayOrder({
    amountMinor: priced.amountMinor,
    currency: DISPLAY_CURRENCY,
    receipt: ref,
    notes: {
      property_id: priced.property.id,
      user_id: user.id,
      nights: String(priced.nights),
    },
  });
  if (!order.ok) return { ok: false, error: order.error };

  return {
    ok: true,
    keyId: cfg.keyId, // public by design; the secret never leaves the server
    orderId: order.order.id,
    amountMinor: order.order.amount,
    currency: order.order.currency,
    bookingRef: ref,
    prefill: {
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      email: email.trim(),
      contact: input.guest.phone?.trim() ?? "",
    },
  };
}

/* ------------------------------------------------------------------ *
 *  2. Verify signature, then create the booking
 * ------------------------------------------------------------------ */

export async function verifyAndCreateBooking(
  payload: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  // --- 1. signature: the only proof the payment is real --------------------
  const signatureOk = verifyPaymentSignature({
    orderId: payload.razorpayOrderId,
    paymentId: payload.razorpayPaymentId,
    signature: payload.razorpaySignature,
  });
  if (!signatureOk) {
    console.warn("[razorpay] signature mismatch for order", payload.razorpayOrderId);
    return { ok: false, error: "We couldn't verify this payment. You have not been charged." };
  }

  // --- 2. re-price server-side; never trust a client-sent amount ------------
  const priced = await priceBooking(payload.booking);
  if (!priced.ok) return { ok: false, error: priced.error };

  // --- 3. confirm with Razorpay that it is captured and for the right sum ---
  const payment = await fetchRazorpayPayment(payload.razorpayPaymentId);
  if (!payment.ok) return { ok: false, error: payment.error };
  if (payment.orderId !== payload.razorpayOrderId) {
    return { ok: false, error: "This payment doesn't match the order." };
  }
  if (!["captured", "authorized"].includes(payment.status)) {
    return { ok: false, error: "The payment hasn't completed. Please try again." };
  }
  if (payment.amount !== priced.amountMinor) {
    console.error(
      `[razorpay] amount mismatch: charged ${payment.amount}, expected ${priced.amountMinor}`,
    );
    return { ok: false, error: "The paid amount doesn't match this booking." };
  }

  // --- 4. write the booking ------------------------------------------------
  // Service role: RLS has no INSERT policy for bookings on purpose, so a row
  // can only appear via this verified path — never straight from a browser.
  let db;
  try {
    db = createAdminClient();
  } catch {
    return {
      ok: false,
      error:
        "Payment succeeded but the booking could not be saved (SUPABASE_SERVICE_ROLE_KEY is not set). Please contact support with reference " +
        payload.bookingRef +
        ".",
    };
  }

  const row = {
    reference: payload.bookingRef,
    guest_id: user.id,
    property_id: priced.property.id,
    check_in: payload.booking.checkIn,
    check_out: payload.booking.checkOut,
    // `nights` is a generated column — Postgres derives it from the dates and
    // rejects any supplied value, so it must not appear here.
    guests: Math.max(1, payload.booking.adults + payload.booking.children),
    total_price: priced.amountInr,
    currency: DISPLAY_CURRENCY,
    // The revenue ledger needs the split, not just the gross. Written here
    // because it cannot be recovered afterwards: the room subtotal and cleaning
    // fee are not stored, so a total alone cannot be decomposed into commission
    // and payout. Rates are recorded alongside the amounts so a future rate
    // change cannot silently rewrite what these bookings earned.
    commission: Math.round(convertFromUsd(priced.breakdown.serviceFee)),
    commission_rate: SERVICE_RATE,
    tax_amount: Math.round(convertFromUsd(priced.breakdown.taxes)),
    tax_rate: priced.breakdown.taxRate,
    host_payout:
      priced.amountInr -
      Math.round(convertFromUsd(priced.breakdown.serviceFee)) -
      Math.round(convertFromUsd(priced.breakdown.taxes)),
    status: "confirmed",
    payment_status: "paid",
    payment_provider: "razorpay",
    razorpay_order_id: payload.razorpayOrderId,
    razorpay_payment_id: payload.razorpayPaymentId,
    paid_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from("bookings") as any)
    .upsert(row, { onConflict: "razorpay_order_id" }) // replayed callback → same row
    .select("reference")
    .maybeSingle();

  if (error) {
    console.error("[razorpay] booking insert failed:", error.message);
    return {
      ok: false,
      error:
        "Your payment went through but we couldn't save the booking. Quote reference " +
        payload.bookingRef +
        " to support — you will not be charged twice.",
    };
  }

  const reference = data?.reference ?? payload.bookingRef;

  // --- 5. tell the guest, and open the thread with their host ---------------
  // Everything below is best-effort: the booking is already paid for and saved,
  // so a failure here must never turn a successful booking into an error.
  await Promise.allSettled([
    raiseNotification({
      userId: user.id,
      type: "booking.confirmed",
      title: "Booking confirmed",
      description: `${priced.property.name} · ${payload.booking.checkIn} to ${payload.booking.checkOut}`,
      link: "/trips",
      metadata: { reference, propertyId: priced.property.id },
    }),
    raiseNotification({
      userId: user.id,
      type: "payment.succeeded",
      title: "Payment successful",
      description: `${formatInr(priced.amountInr)} paid for ${priced.property.name}.`,
      link: "/trips",
      metadata: {
        reference,
        amount: priced.amountInr,
        currency: DISPLAY_CURRENCY,
        paymentId: payload.razorpayPaymentId,
      },
    }),
    ensureBookingConversation({
      guestId: user.id,
      propertyId: priced.property.id,
      bookingRef: reference,
    }),
  ]);

  return {
    ok: true,
    bookingRef: reference,
    total: priced.amountInr,
    currency: DISPLAY_CURRENCY,
    provider: "razorpay",
  };
}

/**
 * Opens the guest↔host thread for a fresh booking.
 *
 * Created here rather than lazily on first visit so the conversation is already
 * waiting in Messages when the guest looks — and so the access rule ("you may
 * message a host you have booked with") is satisfied by a row, not a check
 * scattered through the UI.
 *
 * Uses the service role because it needs the booking id and host, both of which
 * were written moments ago on this same request.
 */
async function ensureBookingConversation(input: {
  guestId: string;
  propertyId: string;
  bookingRef: string;
}): Promise<void> {
  try {
    const db = createAdminClient();

    const { data: booking } = await db
      .from("bookings")
      .select("id")
      .eq("reference", input.bookingRef)
      .maybeSingle();
    if (!booking) return;

    const { data: property } = await db
      .from("properties")
      .select("host_id")
      .eq("id", input.propertyId)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from("conversations") as any).upsert(
      {
        guest_id: input.guestId,
        property_id: input.propertyId,
        booking_id: (booking as { id: string }).id,
        host_profile_id: (property as { host_id: string | null } | null)?.host_id ?? null,
      },
      // Re-running verification for the same booking must not open a second
      // thread; the partial unique index on (guest_id, property_id) catches it.
      { onConflict: "guest_id,property_id", ignoreDuplicates: true },
    );
    if (error) console.error("[booking] conversation create failed:", error.message);
  } catch (err) {
    console.error("[booking] conversation create skipped:", err);
  }
}
