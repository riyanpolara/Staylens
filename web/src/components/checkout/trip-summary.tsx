"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, ChevronLeft, ChevronRight, Loader2, Minus, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DAY_LABELS,
  MONTH_FMT,
  addMonths,
  monthMatrix,
  nightsBetween,
  parseISODate,
  sameDay,
  startOfToday,
  toISODate,
} from "@/lib/calendar";
import type { CheckoutTrip } from "@/components/checkout/checkout-types";

/**
 * "Your trip" — dates and guests, editable in place.
 *
 * Both controls used to be links back to the property page, which threw away
 * the guest's progress on this form to change one number. They now edit here.
 *
 * The URL stays the single source of truth: each editor writes `?in/out/adults/
 * children/infants` and the server page re-renders from them. That is already
 * how this page gets its trip and its price, so the total, the nights and the
 * Razorpay amount all follow automatically — nothing recalculates money on the
 * client.
 *
 * The calendar reuses `@/lib/calendar` rather than the property page's
 * `DateRangeCalendar`, which is bound to `BookingContext` and would drag a
 * second source of truth for the dates onto a page that already has one.
 */

function guestsLabel(g: CheckoutTrip["guests"]): string {
  const people = g.adults + g.children;
  const parts = [`${people} guest${people === 1 ? "" : "s"}`];
  if (g.infants > 0) parts.push(`${g.infants} infant${g.infants === 1 ? "" : "s"}`);
  return parts.join(", ");
}

export function TripSummary({
  trip,
  maxGuests,
  minNights,
}: {
  trip: CheckoutTrip;
  /** From the property; caps the adults + children stepper. */
  maxGuests: number;
  minNights: number;
}) {
  const [open, setOpen] = useState<"dates" | "guests" | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  /** Writes the new trip state to the URL; the server page does the rest. */
  function commit(next: Record<string, string | number | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "" || v === 0) p.delete(k);
      else p.set(k, String(v));
    }
    startTransition(() => {
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    });
  }

  return (
    <section aria-labelledby="trip-heading">
      <h2
        id="trip-heading"
        className="font-display text-xl md:text-2xl font-semibold text-primary mb-5"
      >
        Your trip
        {pending && (
          <Loader2
            aria-label="Updating your trip"
            className="inline-block ml-2 size-4 animate-spin align-middle"
          />
        )}
      </h2>

      <dl className="space-y-4">
        <Row
          icon={<CalendarRange aria-hidden className="size-5 text-primary" />}
          term="Dates"
          detail={`${trip.checkInLabel} – ${trip.checkOutLabel}`}
          editLabel="Edit dates"
          expanded={open === "dates"}
          onToggle={() => setOpen(open === "dates" ? null : "dates")}
        >
          <DatesEditor
            checkInISO={trip.checkInISO}
            checkOutISO={trip.checkOutISO}
            minNights={minNights}
            pending={pending}
            onApply={(inISO, outISO) => {
              commit({ in: inISO, out: outISO });
              setOpen(null);
            }}
          />
        </Row>

        <Row
          icon={<Users aria-hidden className="size-5 text-primary" />}
          term="Guests"
          detail={guestsLabel(trip.guests)}
          editLabel="Edit guests"
          expanded={open === "guests"}
          onToggle={() => setOpen(open === "guests" ? null : "guests")}
        >
          <GuestsEditor
            guests={trip.guests}
            maxGuests={maxGuests}
            pending={pending}
            onChange={(g) =>
              commit({ adults: g.adults, children: g.children, infants: g.infants })
            }
          />
        </Row>
      </dl>
    </section>
  );
}

function Row({
  icon,
  term,
  detail,
  editLabel,
  expanded,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  term: string;
  detail: string;
  editLabel: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = `trip-${term.toLowerCase()}-editor`;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              {term}
            </dt>
            <dd className="text-on-surface font-medium">{detail}</dd>
          </div>
        </div>
        {/* A button, not a link: this opens an editor rather than navigating. */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="text-sm font-semibold underline underline-offset-4 hover:text-primary shrink-0"
        >
          {expanded ? "Done" : editLabel}
        </button>
      </div>

      {expanded && (
        <div
          id={panelId}
          className="mt-4 p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Dates ───────────────────────────────────────────────────────────── */

function DatesEditor({
  checkInISO,
  checkOutISO,
  minNights,
  pending,
  onApply,
}: {
  checkInISO: string;
  checkOutISO: string;
  minNights: number;
  pending: boolean;
  onApply: (inISO: string, outISO: string) => void;
}) {
  const [checkIn, setCheckIn] = useState<Date | null>(() => parseISODate(checkInISO));
  const [checkOut, setCheckOut] = useState<Date | null>(() => parseISODate(checkOutISO));
  const [month, setMonth] = useState<Date>(() => parseISODate(checkInISO) ?? startOfToday());

  const nights = nightsBetween(checkIn, checkOut);
  const tooShort = nights > 0 && nights < minNights;
  const complete = Boolean(checkIn && checkOut) && nights > 0 && !tooShort;

  /** Pick check-in first; the second pick closes the range, or restarts it. */
  function pick(day: Date) {
    if (!checkIn || checkOut || day <= checkIn) {
      setCheckIn(day);
      setCheckOut(null);
      return;
    }
    setCheckOut(day);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          aria-label="Previous month"
          className="p-1.5 rounded-lg hover:bg-surface-container"
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <p className="text-sm font-semibold">{MONTH_FMT.format(month)}</p>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          aria-label="Next month"
          className="p-1.5 rounded-lg hover:bg-surface-container"
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map((d, i) => (
          <span key={i} className="text-[11px] text-on-surface-variant py-1">
            {d}
          </span>
        ))}
        {monthMatrix(month.getFullYear(), month.getMonth()).map((day, i) => {
          if (!day) return <span key={i} />;
          const past = day < startOfToday();
          const isIn = sameDay(day, checkIn);
          const isOut = sameDay(day, checkOut);
          const between =
            checkIn && checkOut ? day > checkIn && day < checkOut : false;

          return (
            <button
              key={i}
              type="button"
              disabled={past}
              onClick={() => pick(day)}
              aria-pressed={isIn || isOut}
              className={cn(
                "aspect-square grid place-items-center rounded-lg text-sm transition-colors",
                past && "text-on-surface-variant/40 cursor-not-allowed",
                !past && !isIn && !isOut && !between && "hover:bg-surface-container",
                between && "bg-primary-container text-on-primary-container",
                (isIn || isOut) && "bg-primary text-white font-semibold",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 mt-4">
        <p className="text-sm text-on-surface-variant" role="status">
          {!checkIn || !checkOut
            ? "Pick a check-in and check-out date."
            : tooShort
              ? `This stay has a ${minNights}-night minimum.`
              : `${nights} night${nights === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          disabled={!complete || pending}
          onClick={() => onApply(toISODate(checkIn)!, toISODate(checkOut)!)}
          className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
        >
          Update dates
        </button>
      </div>
    </div>
  );
}

/* ── Guests ──────────────────────────────────────────────────────────── */

function GuestsEditor({
  guests,
  maxGuests,
  pending,
  onChange,
}: {
  guests: CheckoutTrip["guests"];
  maxGuests: number;
  pending: boolean;
  onChange: (g: CheckoutTrip["guests"]) => void;
}) {
  // Local copy so the steppers stay responsive while the server round-trips,
  // re-synced whenever the committed value actually changes.
  const [draft, setDraft] = useState(guests);
  const committed = useRef(guests);
  useEffect(() => {
    if (
      guests.adults !== committed.current.adults ||
      guests.children !== committed.current.children ||
      guests.infants !== committed.current.infants
    ) {
      committed.current = guests;
      setDraft(guests);
    }
  }, [guests]);

  // Infants do not count toward occupancy, which is how the property's
  // `accommodates` figure is defined.
  const occupancy = draft.adults + draft.children;

  function set(next: CheckoutTrip["guests"]) {
    setDraft(next);
    committed.current = next;
    onChange(next);
  }

  const rows = [
    {
      key: "adults" as const,
      label: "Adults",
      hint: "13 or above",
      min: 1,
      canAdd: occupancy < maxGuests,
    },
    {
      key: "children" as const,
      label: "Children",
      hint: "Ages 2–12",
      min: 0,
      canAdd: occupancy < maxGuests,
    },
    {
      key: "infants" as const,
      label: "Infants",
      hint: "Under 2 — not counted toward the limit",
      min: 0,
      canAdd: draft.infants < 5,
    },
  ];

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-on-surface">{r.label}</p>
            <p className="text-xs text-on-surface-variant">{r.hint}</p>
          </div>
          <div className="flex items-center gap-3">
            <Stepper
              label={`Remove one ${r.label.toLowerCase().replace(/s$/, "")}`}
              disabled={pending || draft[r.key] <= r.min}
              onClick={() => set({ ...draft, [r.key]: draft[r.key] - 1 })}
            >
              <Minus aria-hidden className="size-4" />
            </Stepper>
            <span className="w-6 text-center text-sm font-semibold tabular-nums">
              {draft[r.key]}
            </span>
            <Stepper
              label={`Add one ${r.label.toLowerCase().replace(/s$/, "")}`}
              disabled={pending || !r.canAdd}
              onClick={() => set({ ...draft, [r.key]: draft[r.key] + 1 })}
            >
              <Plus aria-hidden className="size-4" />
            </Stepper>
          </div>
        </div>
      ))}

      <p className="text-xs text-on-surface-variant pt-1" role="status">
        This place allows up to {maxGuests} guest{maxGuests === 1 ? "" : "s"}.
      </p>
    </div>
  );
}

function Stepper({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid place-items-center size-8 rounded-full border border-outline-variant/50 text-on-surface hover:border-primary disabled:opacity-40 disabled:hover:border-outline-variant/50 transition-colors"
    >
      {children}
    </button>
  );
}
