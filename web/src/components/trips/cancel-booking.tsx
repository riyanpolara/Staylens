"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { formatInr } from "@/lib/currency";
import {
  cancelBooking,
  quoteCancellation,
  type CancellationQuote,
} from "@/app/trips/actions";
import { cn } from "@/lib/utils";

/**
 * Cancel a booking: the button, and the confirmation it opens.
 *
 * The refund figure is fetched from the server when the modal opens, never
 * computed here — the amount a guest is shown has to be the amount the database
 * will actually pay, and duplicating the policy in JavaScript is how those two
 * drift apart.
 *
 * The modal is only mounted once opened, so a page of trips does not pay for a
 * dialog per row.
 */

const POLICY_LABEL: Record<string, string> = {
  flexible: "Flexible — full refund up to 24 hours before check-in",
  moderate: "Moderate — full refund up to 5 days before check-in",
  strict_14_with_grace_period:
    "Strict — full refund within 48 hours of booking if check-in is 14+ days away, 50% up to 7 days before",
  super_strict_30: "Super strict — 50% refund if cancelled 30+ days before check-in",
  super_strict_60: "Super strict — 50% refund if cancelled 60+ days before check-in",
};

const DATE = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : DATE.format(d);
};

export function CancelBooking({
  bookingId,
  propertyName,
}: {
  bookingId: string;
  propertyName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<CancellationQuote | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Fetch the quote when the dialog opens, so the figures are current at the
  // moment of the decision rather than whenever the page was rendered.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    quoteCancellation(bookingId).then((res) => {
      if (cancelled) return;
      if (res.ok) setQuote(res.quote);
      else setLoadError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [open, bookingId]);

  // Escape closes; focus moves into the dialog so the keyboard is not left
  // behind on the page underneath.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, pending]);

  function confirm() {
    startTransition(async () => {
      const res = await cancelBooking(bookingId, reason);
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const blocked = quote && !quote.ok;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // Cleared here rather than in the effect: opening is the event that
          // invalidates a previous quote, and resetting during render is what
          // the set-state-in-effect rule exists to prevent.
          setQuote(null);
          setLoadError(null);
          setOpen(true);
        }}
        className="text-sm font-semibold text-destructive hover:underline"
      >
        Cancel booking
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-[20px] p-6 md:p-8 shadow-tinted"
          >
            <div className="flex items-start gap-4">
              <span className="shrink-0 grid place-items-center size-11 rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle aria-hidden className="size-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h2
                  id="cancel-title"
                  className="font-display text-xl font-semibold text-on-surface"
                >
                  Cancel this booking?
                </h2>
                <p className="text-sm text-on-surface-variant mt-0.5 truncate">
                  {propertyName}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                aria-label="Close"
                className="shrink-0 p-2 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>

            {loadError && (
              <p role="alert" className="text-sm text-destructive mt-4">
                {loadError}
              </p>
            )}

            {!quote && !loadError && (
              <p className="text-sm text-on-surface-variant mt-6 flex items-center gap-2">
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Checking your refund…
              </p>
            )}

            {quote && (
              <>
                <dl className="mt-6 space-y-3 text-sm">
                  <Row label="Check-in" value={fmtDate(quote.checkIn)} />
                  <Row label="Check-out" value={fmtDate(quote.checkOut)} />
                  <Row label="Booking amount" value={formatInr(quote.totalPrice)} />
                  {quote.reference && <Row label="Reference" value={quote.reference} />}
                </dl>

                <div className="mt-5 p-4 rounded-xl bg-surface-container-low">
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Cancellation policy
                  </p>
                  <p className="text-sm text-on-surface mt-1">
                    {POLICY_LABEL[quote.policy] ?? quote.policy}
                  </p>
                </div>

                {blocked ? (
                  <p role="alert" className="text-sm text-destructive mt-5">
                    {quote.reason === "checked_in"
                      ? "This stay has already started, so it can't be cancelled here."
                      : quote.reason === "already_cancelled"
                        ? "This booking is already cancelled."
                        : "This booking can't be cancelled."}
                  </p>
                ) : (
                  <>
                    <div
                      className={cn(
                        "mt-5 p-4 rounded-xl flex items-baseline justify-between gap-4",
                        quote.refundAmount > 0
                          ? "bg-primary-container text-on-primary-container"
                          : "bg-surface-container",
                      )}
                    >
                      <span className="text-sm font-semibold">Expected refund</span>
                      <span className="font-display text-xl font-bold">
                        {formatInr(quote.refundAmount)}
                        {quote.refundPercent > 0 && quote.refundPercent < 100 && (
                          <span className="text-sm font-normal">
                            {" "}
                            ({quote.refundPercent}%)
                          </span>
                        )}
                      </span>
                    </div>

                    {quote.refundAmount === 0 && (
                      // Say it plainly rather than letting a ₹0 figure speak for
                      // itself — this is the fact most likely to be disputed.
                      <p className="text-xs text-on-surface-variant mt-2">
                        {quote.paid
                          ? "No refund is due under this policy at this point before check-in."
                          : "This booking was never paid, so there is nothing to refund."}
                      </p>
                    )}

                    <label className="block mt-5">
                      <span className="text-sm text-on-surface-variant">
                        Reason for cancelling (optional)
                      </span>
                      <textarea
                        rows={2}
                        value={reason}
                        maxLength={500}
                        disabled={pending}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Helps us and the host understand what happened."
                        className="mt-1 w-full resize-none py-2 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </label>
                  </>
                )}

                <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className="px-6 py-2.5 rounded-xl border-2 border-outline-variant/40 text-sm font-semibold hover:bg-surface-container transition-colors"
                  >
                    Back
                  </button>
                  {!blocked && (
                    <button
                      type="button"
                      onClick={confirm}
                      disabled={pending}
                      className="px-6 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity"
                    >
                      {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
                      {pending ? "Cancelling…" : "Confirm cancellation"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="font-medium text-on-surface text-right">{value}</dd>
    </div>
  );
}
