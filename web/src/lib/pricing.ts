import { nightsBetween } from "@/lib/calendar";

export type StayPricing = {
  /** whole nights in the selected range (0 when there is no complete range) */
  nights: number;
  /** the nightly rate, unchanged */
  perNight: number;
  /** nightly rate × nights — 0 when no complete range is chosen */
  roomTotal: number;
  /** true when a complete check-in → checkout range is set */
  hasDates: boolean;
};

/**
 * Single source of truth for "what does this stay cost for the chosen dates".
 * Shared by the booking card's price math and the search-results total so the
 * two never disagree. `roomTotal` is the nightly rate × nights (0 with no
 * range); callers decide whether to fall back to showing the nightly rate.
 */
export function computeStayPricing(
  perNight: number,
  checkIn: Date | null,
  checkOut: Date | null,
): StayPricing {
  const nights = nightsBetween(checkIn, checkOut);
  return {
    nights,
    perNight,
    roomTotal: nights * perNight,
    hasDates: nights > 0,
  };
}

/** "for 7 nights" / "for 1 night" — the label shown next to a stay total. */
export function nightsLabel(nights: number): string {
  return `for ${nights} night${nights === 1 ? "" : "s"}`;
}

/**
 * Money formatter. The app renders prices with a bare `$` to match the Stitch
 * design; `currency` is accepted for when multi-currency lands.
 */
export function formatMoney(amount: number, _currency = "USD"): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

/* ------------------------------------------------------------------ *
 *  Full booking breakdown (checkout) — service fee, taxes, coupon.
 *  Shared by the booking card's service-fee math and the checkout so
 *  the numbers never drift.
 * ------------------------------------------------------------------ */

/** platform service fee, applied to the room subtotal (display only) */
export const SERVICE_RATE = 0.12;
/** occupancy/lodging tax, applied to the discounted subtotal */
export const TAX_RATE = 0.08;

export type BookingBreakdown = {
  currency: string;
  nights: number;
  perNight: number;
  /** perNight × nights */
  roomTotal: number;
  cleaningFee: number;
  serviceFee: number;
  /** positive amount subtracted by a coupon (0 when none) */
  discount: number;
  couponCode: string | null;
  taxRate: number;
  taxes: number;
  /** grand total the guest pays */
  total: number;
};

/**
 * Authoritative price breakdown for a booking. Called on the client for live
 * preview AND re-run on the server at submit time (never trust the client's
 * numbers). `discount` is a pre-validated coupon amount in currency units.
 */
export function computeBookingBreakdown(input: {
  perNight: number;
  nights: number;
  cleaningFee?: number | null;
  currency?: string;
  discount?: number;
  couponCode?: string | null;
}): BookingBreakdown {
  const nights = Math.max(0, Math.trunc(input.nights));
  const roomTotal = nights * input.perNight;
  const cleaningFee = nights > 0 ? (input.cleaningFee ?? 0) : 0;
  const serviceFee = Math.round(roomTotal * SERVICE_RATE);
  const preDiscount = roomTotal + cleaningFee + serviceFee;
  const discount = Math.min(Math.max(0, Math.round(input.discount ?? 0)), preDiscount);
  const taxableBase = Math.max(0, preDiscount - discount);
  const taxes = Math.round(taxableBase * TAX_RATE);
  return {
    currency: input.currency ?? "USD",
    nights,
    perNight: input.perNight,
    roomTotal,
    cleaningFee,
    serviceFee,
    discount,
    couponCode: input.couponCode ?? null,
    taxRate: TAX_RATE,
    taxes,
    total: taxableBase + taxes,
  };
}
