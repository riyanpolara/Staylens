"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAdmin } from "@/lib/admin/auth";
import {
  ASSIGNABLE_STATUSES,
  PAYMENT_STATUSES,
  type BookingStatus,
  type PaymentStatus,
} from "@/lib/admin/bookings-query";

/**
 * Booking mutations for /admin/bookings.
 *
 * Server Actions are reachable by direct POST, not only through this UI, so
 * every one of them re-checks admin here even though the /admin layout already
 * gates the page — and the underlying RPCs check a third time in the database.
 * The value is validated against the enum before the call so a tampered form
 * gets a clean message instead of a Postgres cast error.
 */

export type ActionState = { ok: boolean; message: string } | null;

const FORBIDDEN: ActionState = {
  ok: false,
  message: "You don't have permission to change bookings.",
};

/** Postgres messages we raise deliberately are safe to show; others are not. */
function surface(message: string | undefined): string {
  const m = (message ?? "").trim();
  if (!m) return "The change couldn't be saved.";
  if (/forbidden/i.test(m)) return "You don't have permission to change bookings.";
  if (/not found/i.test(m)) return "That booking no longer exists.";
  if (/already cancelled/i.test(m)) return "This booking is already cancelled.";
  if (/reason is required/i.test(m)) return "Enter a reason for the cancellation.";
  if (/admin_booking_cancel/i.test(m)) return "Use Cancel booking to cancel a reservation.";
  // Overlapping-date exclusion constraint — the one schema error an operator
  // can actually act on (reinstating a booking whose dates are now taken).
  if (/no_overlapping_bookings/i.test(m)) {
    return "Those dates are already taken by another confirmed booking on this property.";
  }
  if (/could not find the function/i.test(m)) {
    return "Booking queries aren't installed. Apply supabase/migrations/0017_bookings_admin.sql.";
  }
  return "The change couldn't be saved.";
}

/** Shared tail of every mutation: log the real error, show a safe one. */
function settle(
  fn: string,
  error: { message?: string } | null,
  successMessage: string,
): ActionState {
  if (error) {
    console.error(`[admin/bookings] ${fn} failed:`, error.message);
    return { ok: false, message: surface(error.message) };
  }

  // The list, its header metrics and the open detail panel all read the same
  // rows, so the whole route has to re-render — not just the edited row.
  revalidatePath("/admin/bookings");
  return { ok: true, message: successMessage };
}

function bookingId(formData: FormData): string | null {
  const id = String(formData.get("id") ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

/** Move a booking between pending / confirmed / completed / declined. */
export async function setBookingStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if ((await checkAdmin()).state !== "admin") return FORBIDDEN;

  const id = bookingId(formData);
  if (!id) return { ok: false, message: "Missing booking reference." };

  const status = String(formData.get("status") ?? "").toLowerCase() as BookingStatus;
  if (!(ASSIGNABLE_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, message: "Cancelling needs a reason — use Cancel booking." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_booking_set_status", {
    p_id: id,
    p_status: status,
  });
  return settle("admin_booking_set_status", error, `Booking marked ${status}.`);
}

/** Record where the money is: pending / paid / failed / refunded. */
export async function setPaymentStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if ((await checkAdmin()).state !== "admin") return FORBIDDEN;

  const id = bookingId(formData);
  if (!id) return { ok: false, message: "Missing booking reference." };

  const payment = String(formData.get("payment") ?? "").toLowerCase() as PaymentStatus;
  if (!(PAYMENT_STATUSES as readonly string[]).includes(payment)) {
    return { ok: false, message: "Unknown payment status." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_booking_set_payment", {
    p_id: id,
    p_payment: payment,
  });
  return settle("admin_booking_set_payment", error, `Payment marked ${payment}.`);
}

/**
 * Cancel a booking. The reason is mandatory and stored with the acting admin
 * and a timestamp — it is the first thing asked for in a dispute.
 */
export async function cancelBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if ((await checkAdmin()).state !== "admin") return FORBIDDEN;

  const id = bookingId(formData);
  if (!id) return { ok: false, message: "Missing booking reference." };

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 4) {
    return { ok: false, message: "Enter a reason for the cancellation (at least 4 characters)." };
  }

  const refund = formData.get("refund") !== null;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_booking_cancel", {
    p_id: id,
    p_reason: reason.slice(0, 500),
    p_refund: refund,
  });
  return settle(
    "admin_booking_cancel",
    error,
    refund ? "Booking cancelled and refunded." : "Booking cancelled.",
  );
}
