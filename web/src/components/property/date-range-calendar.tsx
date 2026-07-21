"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  DAY_LABELS,
  MONTH_FMT,
  addMonths,
  monthMatrix,
  sameDay,
  startOfToday,
} from "@/lib/calendar";
import { useBooking } from "@/components/property/booking-context";

function Month({
  base,
  checkIn,
  checkOut,
  onPick,
}: {
  base: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  onPick: (d: Date) => void;
}) {
  const today = startOfToday();
  const cells = monthMatrix(base.getFullYear(), base.getMonth());
  return (
    <div className="flex-1 min-w-0">
      <p className="text-center font-semibold mb-4">{MONTH_FMT.format(base)}</p>
      <div className="grid grid-cols-7 text-center text-xs text-on-surface-variant mb-2">
        {DAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <span key={`e${i}`} />;
          const past = date < today;
          const isStart = sameDay(date, checkIn);
          const isEnd = sameDay(date, checkOut);
          const inRange = checkIn && checkOut && date > checkIn && date < checkOut;
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={past}
              onClick={() => onPick(date)}
              aria-label={date.toDateString()}
              aria-pressed={isStart || isEnd}
              className={cn(
                "h-10 w-full flex items-center justify-center text-sm transition-colors rounded-full",
                past && "text-outline-variant line-through cursor-default",
                inRange && "bg-primary-fixed/40 rounded-none",
                !past && !isStart && !isEnd && !inRange && "hover:border hover:border-on-surface/60",
                (isStart || isEnd) && "cta-gradient text-white font-semibold",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Dual-month range picker bound to the booking context. Shared by the
 * Availability section and the booking sidebar's date popover so the
 * calendar UI lives in exactly one place.
 */
export function DateRangeCalendar({ className }: { className?: string }) {
  const { checkIn, checkOut, setDate } = useBooking();
  const [offset, setOffset] = useState(0);
  const base = addMonths(startOfToday(), offset);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Previous month"
        disabled={offset === 0}
        onClick={() => setOffset((o) => Math.max(0, o - 1))}
        className="absolute -top-1 left-0 w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container disabled:opacity-30 transition-colors"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => setOffset((o) => o + 1)}
        className="absolute -top-1 right-0 w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
      >
        <ChevronRight aria-hidden className="size-4" />
      </button>
      <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 pt-1">
        <Month base={base} checkIn={checkIn} checkOut={checkOut} onPick={setDate} />
        <Month base={addMonths(base, 1)} checkIn={checkIn} checkOut={checkOut} onPick={setDate} />
      </div>
    </div>
  );
}
