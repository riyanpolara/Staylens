"use client";

import { useBooking } from "@/components/property/booking-context";
import { DateRangeCalendar } from "@/components/property/date-range-calendar";

/** "Availability" section — dual-month range picker bound to the booking context. */
export function AvailabilityCalendar() {
  const { checkIn, checkOut, minNights, clearDates, nights } = useBooking();

  return (
    <section aria-labelledby="availability-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 id="availability-heading" className="font-display text-xl md:text-2xl font-semibold text-primary">
          Availability
        </h2>
        {(checkIn || checkOut) && (
          <button
            type="button"
            onClick={clearDates}
            className="text-sm font-semibold underline underline-offset-4 hover:text-primary"
          >
            Clear dates
          </button>
        )}
      </div>
      <p className="text-on-surface-variant text-sm mb-6">
        {checkIn && checkOut
          ? `${nights} night${nights !== 1 ? "s" : ""} selected`
          : minNights > 1
            ? `Minimum stay: ${minNights} nights`
            : "Select your check-in date"}
      </p>

      <div className="rounded-2xl border border-outline-variant/30 p-5 md:p-6 shadow-tinted">
        <DateRangeCalendar />
      </div>
    </section>
  );
}
