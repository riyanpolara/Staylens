"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { raiseNotification } from "@/lib/notifications";
import { formatInr } from "@/lib/currency";

/**
 * Guest-facing cancellation.
 *
 * All the money logic lives in Postgres (`booking_cancellation_quote`,
 * `cancel_my_booking`, `settle_refund` — migration 0025). These actions carry
 * requests to it and raise the notification; they never compute a refund.
 *
 * That split matters: the RPCs are SECURITY DEFINER and re-derive the refund
 * from the property's cancellation policy at the moment of cancellation, so a
 * stale modal — or a crafted request — cannot lock in a better rate than the
 * policy allows.
 */

export type CancellationQuote = {
  ok: boolean;
  reason: string | null;
  bookingId: string;
  reference: string | null;
  propertyName: string | null;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  currency: string;
  paid: boolean;
  policy: string;
  refundPercent: number;
  refundAmount: number;
  daysToCheckIn: number;
};

export type QuoteResult =
  | { ok: true; quote: CancellationQuote }
  | { ok: false; error: string };

export type CancelResult =
  | { ok: true; refundAmount: number; refundStatus: string | null }
  | { ok: false; error: string };

/** Why a booking cannot be cancelled, in words a guest can act on. */
const BLOCKED: Record<string, string> = {
  not_found: "That booking no longer exists.",
  not_yours: "That booking isn't on your account.",
  already_cancelled: "This booking is already cancelled.",
  already_completed: "This stay has already finished.",
  checked_in: "This stay has already started, so it can't be cancelled here.",
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const NOTIFY_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/**
 * Deep link to one booking on the trips page.
 *
 * The query param drives the highlight; the hash makes the browser scroll to
 * that card on arrival. Together they land the guest on the exact booking with
 * no client-side scrolling code and no change to how /trips routes.
 *
 * Not exported: a "use server" module may only export async functions, and
 * nothing outside this file builds these links.
 */
function tripLink(bookingId: string): string {
  return `/trips?booking=${bookingId}#booking-${bookingId}`;
}

/** "10 Aug – 13 Aug", or null when the dates are unknown. */
function stayRange(checkIn: string | null, checkOut: string | null): string | null {
  if (!checkIn || !checkOut) return null;
  const a = new Date(`${checkIn}T00:00:00Z`);
  const b = new Date(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return `${NOTIFY_DATE.format(a)} – ${NOTIFY_DATE.format(b)}`;
}

/**
 * The StayLens refund confirmation.
 *
 * Raised only once `settle_refund` has actually moved the row to `completed`,
 * so the message and the database agree. Every value it mentions is also stored
 * in `metadata` — the message string is for reading, not for parsing, and a
 * later feature that needs the amount or the booking should read the JSON.
 */
async function raiseRefundCompleted(input: {
  userId: string;
  bookingId: string;
  propertyName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  amount: number;
}): Promise<void> {
  const stay = stayRange(input.checkIn, input.checkOut);
  const lines = [
    input.propertyName
      ? `Your refund for ${input.propertyName} has been completed successfully.`
      : "Your refund has been completed successfully.",
    stay ? `Booking: ${stay}` : null,
    `Refund amount: ${formatInr(input.amount)}`,
    "Thank you for choosing StayLens.",
  ].filter(Boolean);

  await raiseNotification({
    userId: input.userId,
    type: "refund.completed",
    title: "Refund completed",
    description: lines.join("\n"),
    // Straight to the trip this concerns, not a generic list.
    link: tripLink(input.bookingId),
    metadata: {
      booking_id: input.bookingId,
      property_name: input.propertyName,
      check_in: input.checkIn,
      check_out: input.checkOut,
      refund_amount: input.amount,
      refund_status: "completed",
      currency: "INR",
    },
  });
}

/** What the confirmation modal shows. Read-only — nothing is changed. */
export async function quoteCancellation(bookingId: string): Promise<QuoteResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("booking_cancellation_quote", {
    p_id: bookingId,
  });

  if (error) {
    console.error("[trips] quote failed:", error.message);
    return { ok: false, error: "We couldn't check this booking. Please try again." };
  }

  const q = data as unknown as Record<string, unknown> | null;
  if (!q) return { ok: false, error: "That booking no longer exists." };

  const reason = (q.reason as string | null) ?? null;
  if (reason && (reason === "not_found" || reason === "not_yours")) {
    return { ok: false, error: BLOCKED[reason] };
  }

  return {
    ok: true,
    quote: {
      ok: q.ok === true,
      reason,
      bookingId,
      reference: (q.reference as string | null) ?? null,
      propertyName: (q.property_name as string | null) ?? null,
      checkIn: String(q.check_in ?? ""),
      checkOut: String(q.check_out ?? ""),
      totalPrice: num(q.total_price),
      currency: String(q.currency ?? "INR"),
      paid: q.paid === true,
      policy: String(q.policy ?? ""),
      refundPercent: num(q.refund_percent),
      refundAmount: num(q.refund_amount),
      daysToCheckIn: num(q.days_to_checkin),
    },
  };
}

/**
 * Cancels, then settles the refund.
 *
 * Phase 1 settles immediately, which is why `processing` and `completed` happen
 * in one call. They are still two distinct database states, so when a real
 * provider refund is wired up only the second step moves — behind a webhook —
 * and nothing here changes shape.
 */
export async function cancelBooking(
  bookingId: string,
  reason?: string,
): Promise<CancelResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to cancel a booking." };

  // Captured before cancelling: the quote carries the property name and dates
  // the refund notification has to name, and cancelling is what makes them
  // harder to read back cleanly. It is the same RPC the modal used, so the
  // figures in the notification match the ones the guest agreed to.
  const before = await quoteCancellation(bookingId);
  const details = before.ok ? before.quote : null;

  const { data, error } = await supabase.rpc("cancel_my_booking", {
    p_id: bookingId,
    p_reason: reason?.trim() ? reason.trim().slice(0, 500) : undefined,
  });

  if (error) {
    console.error("[trips] cancel failed:", error.message);
    return { ok: false, error: "We couldn't cancel this booking. Please try again." };
  }

  const r = data as unknown as Record<string, unknown> | null;
  if (!r?.ok) {
    const why = (r?.reason as string | null) ?? "not_found";
    return { ok: false, error: BLOCKED[why] ?? "This booking can't be cancelled." };
  }

  const refundAmount = num(r.refund_amount);
  let refundStatus = (r.refund_status as string | null) ?? null;

  // Best-effort throughout: the cancellation is already recorded, so a failed
  // notification must never turn a successful cancellation into an error.
  await raiseNotification({
    userId: user.id,
    type: "booking.cancelled",
    title: "Booking cancelled",
    description: details?.propertyName
      ? `Your booking for ${details.propertyName} has been cancelled.`
      : "Your booking has been cancelled.",
    link: tripLink(bookingId),
    metadata: {
      booking_id: bookingId,
      property_name: details?.propertyName ?? null,
      check_in: details?.checkIn ?? null,
      check_out: details?.checkOut ?? null,
      refund_amount: refundAmount,
      refund_status: refundStatus,
    },
  });

  // Settle straight away for the MVP. A failure here leaves the booking
  // cancelled with the refund still 'processing', which is recoverable and
  // visible — the opposite (settled but not cancelled) would not be.
  if (refundAmount > 0) {
    const { error: settleError } = await supabase.rpc("settle_refund", {
      p_id: bookingId,
    });
    if (settleError) {
      console.error("[trips] settle failed:", settleError.message);
    } else {
      refundStatus = "completed";
      // Only once the refund actually reached 'completed'. Raising this
      // alongside the cancellation would tell the guest their money is back
      // before the row says so.
      await raiseRefundCompleted({
        userId: user.id,
        bookingId,
        propertyName: details?.propertyName ?? null,
        checkIn: details?.checkIn ?? null,
        checkOut: details?.checkOut ?? null,
        amount: refundAmount,
      });
    }
  }

  revalidatePath("/trips");
  revalidatePath("/profile/edit");

  return { ok: true, refundAmount, refundStatus };
}
