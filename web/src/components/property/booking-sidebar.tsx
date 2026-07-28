"use client";

import Link from "next/link";
import { ChevronDown, Diamond, Minus, Plus, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useBooking } from "@/components/property/booking-context";
import { DateRangeCalendar } from "@/components/property/date-range-calendar";
import { nightsLabel } from "@/lib/pricing";
import { formatPrice } from "@/lib/currency";
import { checkoutHref } from "@/lib/checkout-url";

const DATE_FMT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
/** "8 Jul 2026" — matches the popover header range in the design. */
const RANGE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const GUEST_ROWS = [
  { key: "adults" as const, label: "Adults", sub: "Ages 13+" },
  { key: "children" as const, label: "Children", sub: "Ages 2–12" },
  { key: "infants" as const, label: "Infants", sub: "Under 2" },
];

/**
 * Sticky booking card (Stitch design). Reflects the shared booking state:
 * clicking the date card opens a dual-month calendar popover; guests are
 * edited here. Shows a live price breakdown and a "Reserve" button — NO
 * checkout (per scope).
 */
export function BookingSidebar({
  rating,
  propertyId,
}: {
  rating: number;
  propertyId: string;
}) {
  const {
    price,
    cleaningFee,
    checkIn,
    checkOut,
    nights,
    subtotal,
    serviceFee,
    total,
    guests,
    guestCount,
    maxGuests,
    setGuests,
    clearDates,
    clearCheckOut,
  } = useBooking();
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const dateWrapRef = useRef<HTMLDivElement>(null);

  const cleaning = nights > 0 ? (cleaningFee ?? 0) : 0;

  // click-outside + Escape close the date popover
  useEffect(() => {
    if (!datesOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (dateWrapRef.current && !dateWrapRef.current.contains(e.target as Node)) {
        setDatesOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDatesOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [datesOpen]);

  function bump(key: keyof typeof guests, delta: number) {
    const next = { ...guests, [key]: Math.max(0, guests[key] + delta) };
    if (key === "adults" && next.adults < 1) next.adults = 1;
    if (next.adults + next.children > maxGuests && delta > 0) return;
    setGuests(next);
  }

  return (
    <div
      id="booking-card"
      className="sticky top-28 bg-surface-container-lowest rounded-[20px] border border-outline-variant/30 p-6 md:p-8 shadow-tinted transition-shadow hover:shadow-tinted-lg"
    >
      <div className="flex justify-between items-end mb-8">
        <div>
          {nights > 0 ? (
            <>
              <span className="font-display text-2xl font-bold text-primary">
                {formatPrice(subtotal)}
              </span>
              <span className="text-on-surface-variant"> {nightsLabel(nights)}</span>
            </>
          ) : (
            <>
              <span className="font-display text-2xl font-bold text-primary">
                {formatPrice(price)}
              </span>
              <span className="text-on-surface-variant"> / night</span>
            </>
          )}
        </div>
        {rating > 0 && (
          <div className="flex items-center gap-1 text-sm font-bold">
            <Star aria-hidden className="size-4 text-primary fill-primary" />
            {rating.toFixed(2)}
          </div>
        )}
      </div>

      {/* date + guest selectors */}
      <div className="space-y-3 mb-6">
        <div ref={dateWrapRef} className="relative">
          <button
            type="button"
            aria-expanded={datesOpen}
            aria-label="Select check-in and checkout dates"
            onClick={() => setDatesOpen((o) => !o)}
            className={cn(
              "grid grid-cols-2 w-full border rounded-xl overflow-hidden text-left transition-colors",
              datesOpen ? "border-primary ring-1 ring-primary" : "border-outline-variant hover:border-on-surface",
            )}
          >
            {[
              { label: "Check-in", val: checkIn },
              { label: "Check-out", val: checkOut },
            ].map((f, i) => (
              <span
                key={f.label}
                className={cn(
                  "block p-3 bg-surface",
                  i === 0 && "border-r border-outline-variant",
                )}
              >
                <span className="block text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                  {f.label}
                </span>
                <span className="text-sm text-on-surface">
                  {f.val ? DATE_FMT.format(f.val) : "Add date"}
                </span>
              </span>
            ))}
          </button>

          {datesOpen && (
            <div className="absolute right-0 top-full mt-3 z-50 w-[min(680px,92vw)] bg-surface-container-lowest rounded-[24px] border border-outline-variant/30 shadow-tinted-lg p-5 md:p-6">
              {/* header: nights + range summary · clearable date fields */}
              <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
                <div>
                  <p className="font-display text-lg font-semibold text-on-surface">
                    {nights > 0
                      ? `${nights} night${nights !== 1 ? "s" : ""}`
                      : "Select dates"}
                  </p>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    {checkIn && checkOut
                      ? `${RANGE_FMT.format(checkIn)} - ${RANGE_FMT.format(checkOut)}`
                      : "Add your travel dates for exact pricing"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  {[
                    { label: "CHECK-IN", val: checkIn, onClear: clearDates },
                    { label: "CHECKOUT", val: checkOut, onClear: clearCheckOut },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="min-w-[120px] border border-outline-variant rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0">
                        <span className="block text-[10px] font-bold text-primary uppercase tracking-wider">
                          {f.label}
                        </span>
                        <span className="block text-sm text-on-surface truncate">
                          {f.val ? DATE_FMT.format(f.val) : "Add date"}
                        </span>
                      </span>
                      {f.val && (
                        <button
                          type="button"
                          aria-label={`Clear ${f.label.toLowerCase()} date`}
                          onClick={f.onClear}
                          className="shrink-0 w-6 h-6 rounded-full border border-outline-variant/60 flex items-center justify-center hover:border-on-surface hover:bg-surface-container transition-colors"
                        >
                          <X aria-hidden className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <DateRangeCalendar />

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={clearDates}
                  disabled={!checkIn && !checkOut}
                  className="text-sm font-semibold underline underline-offset-4 hover:text-primary disabled:opacity-40 disabled:no-underline"
                >
                  Clear dates
                </button>
                <button
                  type="button"
                  onClick={() => setDatesOpen(false)}
                  className="px-6 py-2.5 rounded-xl cta-gradient text-white font-semibold text-sm active:scale-95 transition-transform"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border border-outline-variant rounded-xl bg-surface overflow-hidden">
          <button
            type="button"
            aria-expanded={guestsOpen}
            onClick={() => setGuestsOpen((o) => !o)}
            className="w-full p-3 text-left hover:bg-surface-container-low transition-colors"
          >
            <span className="block text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
              Guests
            </span>
            <span className="flex justify-between items-center">
              <span className="text-sm text-on-surface">
                {guestCount} guest{guestCount !== 1 ? "s" : ""}
                {guests.infants > 0 ? `, ${guests.infants} infant${guests.infants > 1 ? "s" : ""}` : ""}
              </span>
              <ChevronDown
                aria-hidden
                className={cn("size-4 text-primary transition-transform", guestsOpen && "rotate-180")}
              />
            </span>
          </button>
          {guestsOpen && (
            <div className="px-3 pb-3 border-t border-outline-variant/30">
              {GUEST_ROWS.map((row) => (
                <div key={row.key} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold">{row.label}</p>
                    <p className="text-xs text-on-surface-variant">{row.sub}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={`Decrease ${row.label}`}
                      disabled={guests[row.key] === 0 || (row.key === "adults" && guests.adults <= 1)}
                      onClick={() => bump(row.key, -1)}
                      className="w-7 h-7 rounded-full border border-outline-variant/60 flex items-center justify-center disabled:opacity-30 hover:border-on-surface transition-colors"
                    >
                      <Minus aria-hidden className="size-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm tabular-nums">{guests[row.key]}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${row.label}`}
                      onClick={() => bump(row.key, 1)}
                      className="w-7 h-7 rounded-full border border-outline-variant/60 flex items-center justify-center hover:border-on-surface transition-colors"
                    >
                      <Plus aria-hidden className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {nights > 0 ? (
        <Link
          href={checkoutHref(propertyId, { checkIn, checkOut, guests })}
          className="block w-full py-4 rounded-xl cta-gradient text-white font-semibold shadow-lg mb-3 text-center active:scale-95 transition-transform"
        >
          Reserve
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setDatesOpen(true)}
          className="w-full py-4 rounded-xl cta-gradient text-white font-semibold shadow-lg mb-3 active:scale-95 transition-transform"
        >
          Check availability
        </button>
      )}
      <p className="text-center text-xs text-on-surface-variant mb-6">
        You won&apos;t be charged yet
      </p>

      {/* price breakdown (only once a range is chosen) */}
      {nights > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between text-on-surface-variant">
            <span className="underline">
              {formatPrice(price)} × {nights} night{nights !== 1 ? "s" : ""}
            </span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {cleaning > 0 && (
            <div className="flex justify-between text-on-surface-variant">
              <span className="underline">Cleaning fee</span>
              <span>{formatPrice(cleaning)}</span>
            </div>
          )}
          <div className="flex justify-between text-on-surface-variant">
            <span className="underline">Staylens service fee</span>
            <span>{formatPrice(serviceFee)}</span>
          </div>
          <hr className="border-outline-variant/30 my-2" />
          <div className="flex justify-between font-display text-lg font-semibold text-primary">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-tertiary-container/10 rounded-xl border border-tertiary-container/20 flex gap-3">
        <Diamond aria-hidden className="size-5 text-tertiary shrink-0" />
        <p className="text-xs text-tertiary font-medium">
          Premium property with curated experiences available upon request.
        </p>
      </div>
    </div>
  );
}
