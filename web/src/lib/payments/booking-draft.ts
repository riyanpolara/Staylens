"use client";

import type { BookingInput } from "@/components/checkout/checkout-types";

/**
 * Hand-off between the reservation step and the payment page.
 *
 * The guest's name, email and phone must not travel in the query string —
 * URLs leak into browser history, server logs, referrer headers and shared
 * links. sessionStorage keeps the draft on the one tab that created it and
 * disappears when the tab closes, which is the right lifetime for a checkout
 * in progress.
 *
 * Nothing here is trusted: the server re-prices the booking and re-reads the
 * signed-in user before charging, so a tampered draft cannot change the amount
 * or the buyer.
 */

const KEY = "staylens:booking-draft";
/** Drafts older than this are treated as abandoned. */
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export type BookingDraft = {
  propertyId: string;
  booking: BookingInput;
  couponCode: string | null;
  savedAt: number;
};

export function writeBookingDraft(booking: BookingInput): void {
  if (typeof window === "undefined") return;
  const draft: BookingDraft = {
    propertyId: booking.propertyId,
    booking,
    couponCode: booking.couponCode ?? null,
    savedAt: Date.now(),
  };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* private mode / quota — the payment page will bounce back to the form */
  }
}

/** Returns the draft only if it is fresh and for the property being paid for. */
export function readBookingDraft(propertyId: string): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as BookingDraft;
    if (draft.propertyId !== propertyId) return null;
    if (!draft.savedAt || Date.now() - draft.savedAt > MAX_AGE_MS) return null;
    if (!draft.booking?.checkIn || !draft.booking?.checkOut) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearBookingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
