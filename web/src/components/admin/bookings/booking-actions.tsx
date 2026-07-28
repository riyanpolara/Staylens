"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, CircleAlert } from "lucide-react";
import {
  cancelBookingAction,
  setBookingStatusAction,
  setPaymentStatusAction,
  type ActionState,
} from "@/app/admin/bookings/actions";
import {
  ASSIGNABLE_STATUSES,
  PAYMENT_STATUSES,
  type BookingStatus,
  type PaymentStatus,
} from "@/lib/admin/bookings-query";

/**
 * The write half of the detail panel.
 *
 * Each control is a real `<form>` posting to a Server Action, so the buttons
 * work before hydration and there is no optimistic local copy of the booking
 * to fall out of sync — the action revalidates `/admin/bookings` and the
 * server re-renders this panel with whatever the database actually holds.
 */

function label(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/** Result banner shared by all three controls. */
function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  const Icon = state.ok ? Check : CircleAlert;
  return (
    <p
      className="admin-bk-feedback"
      data-tone={state.ok ? "ok" : "error"}
      role={state.ok ? "status" : "alert"}
    >
      <Icon size={14} aria-hidden />
      {state.message}
    </p>
  );
}

/* ── Booking status ───────────────────────────────────────────────────── */

export function StatusControls({
  bookingId,
  current,
}: {
  bookingId: string;
  current: BookingStatus;
}) {
  const [state, action, pending] = useActionState(setBookingStatusAction, null);
  const cancelled = current === "cancelled";

  return (
    <div className="admin-bk-control">
      <p className="card-kicker">Booking status</p>
      <form action={action} className="admin-bk-choices">
        <input type="hidden" name="id" value={bookingId} />
        {ASSIGNABLE_STATUSES.map((s) => (
          <button
            key={s}
            type="submit"
            name="status"
            value={s}
            className="btn btn-secondary admin-bk-choice"
            data-current={s === current || undefined}
            disabled={pending || s === current}
            aria-current={s === current || undefined}
          >
            {label(s)}
          </button>
        ))}
      </form>
      {cancelled && (
        <p className="text-muted admin-bk-hint">
          Choosing a status above reinstates this booking and clears the cancellation record.
        </p>
      )}
      <Feedback state={state} />
    </div>
  );
}

/* ── Payment status ───────────────────────────────────────────────────── */

export function PaymentControls({
  bookingId,
  current,
}: {
  bookingId: string;
  current: PaymentStatus;
}) {
  const [state, action, pending] = useActionState(setPaymentStatusAction, null);

  return (
    <div className="admin-bk-control">
      <p className="card-kicker">Payment status</p>
      <form action={action} className="admin-bk-choices">
        <input type="hidden" name="id" value={bookingId} />
        {PAYMENT_STATUSES.map((p) => (
          <button
            key={p}
            type="submit"
            name="payment"
            value={p}
            className="btn btn-secondary admin-bk-choice"
            data-current={p === current || undefined}
            disabled={pending || p === current}
            aria-current={p === current || undefined}
          >
            {label(p)}
          </button>
        ))}
      </form>
      <Feedback state={state} />
    </div>
  );
}

/* ── Cancellation ─────────────────────────────────────────────────────── */

/**
 * Cancelling is destructive and irreversible from the guest's side, so it goes
 * through an explicit confirm step whose copy states the consequence — per the
 * design handoff's rule for destructive actions.
 */
export function CancelBooking({
  bookingId,
  reference,
  guestName,
  isPaid,
  alreadyCancelled,
}: {
  bookingId: string;
  reference: string;
  guestName: string;
  isPaid: boolean;
  alreadyCancelled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelBookingAction, null);

  // The form collapses on success by derivation, not by syncing state in an
  // effect: once the action succeeds there is nothing left to submit. (The
  // action revalidates the route, so the panel re-renders as cancelled and
  // this component unmounts a moment later anyway.)
  const showForm = open && !state?.ok;

  if (alreadyCancelled) return null;

  return (
    <div className="admin-bk-control admin-bk-danger">
      <p className="card-kicker">Cancellation</p>

      {!showForm ? (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
            <AlertTriangle size={15} aria-hidden />
            Cancel booking
          </button>
          <Feedback state={state} />
        </>
      ) : (
        <form action={action} className="admin-bk-cancel-form">
          <input type="hidden" name="id" value={bookingId} />

          <p className="admin-bk-hint">
            {reference} will be cancelled for {guestName}. The stay is released back to the
            calendar and the reason below is recorded against your account — it cannot be
            undone from the guest&rsquo;s side.
          </p>

          <label className="field admin-bk-reason">
            <span className="admin-bk-field-label">Reason (recorded, required)</span>
            <textarea
              className="input"
              name="reason"
              required
              minLength={4}
              maxLength={500}
              rows={3}
              placeholder="e.g. Guest requested — property unavailable due to maintenance"
            />
          </label>

          {isPaid ? (
            <label className="radio admin-bk-refund">
              <input type="checkbox" name="refund" defaultChecked />
              <span>Refund the payment ({reference} is marked paid)</span>
            </label>
          ) : (
            <p className="text-muted admin-bk-hint">
              Nothing to refund — this booking has not been paid.
            </p>
          )}

          <div className="admin-bk-cancel-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Keep booking
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Cancelling…" : "Cancel booking"}
            </button>
          </div>

          <Feedback state={state} />
        </form>
      )}
    </div>
  );
}
