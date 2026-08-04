"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateMonths } from "@/components/search/flexible-search-state";

/**
 * "When do you want to go?" — a horizontally scrolling strip of month cards.
 *
 * Months are generated from today (current + next 11), never hardcoded: a fixed
 * list rots into the past, and a guest opening this in December must still see
 * next year.
 *
 * Card width comes from a `--cards` custom property set per breakpoint, so the
 * 6 / 4 / 2.3 requirement is one number in three media queries rather than three
 * separate layouts. The fractional 2.3 on mobile is deliberate — a partly
 * visible fourth card is what tells a thumb there is more to swipe.
 *
 * Keyboard: the strip is a listbox with roving tabindex. Arrow keys move
 * between months, Home/End jump to the ends, Enter and Space toggle. Only the
 * focused card is tabbable, so the strip is one Tab stop rather than twelve.
 */
export function FlexibleMonthCarousel({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (key: string) => void;
}) {
  // Generated once per mount: regenerating on every render would rebuild the
  // list (and the DOM keys) on a date rollover mid-session.
  const months = useMemo(() => generateMonths(12), []);
  const [focusIndex, setFocusIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);

  function focusCard(index: number) {
    const clamped = Math.max(0, Math.min(months.length - 1, index));
    setFocusIndex(clamped);
    const el = stripRef.current?.querySelectorAll<HTMLButtonElement>("[data-month]")[
      clamped
    ];
    el?.focus();
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusCard(focusIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusCard(focusIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        focusCard(0);
        break;
      case "End":
        e.preventDefault();
        focusCard(months.length - 1);
        break;
      // Enter and Space are left to the buttons' own activation.
    }
  }

  return (
    <div>
      <h3 className="text-center font-display text-xl md:text-2xl font-semibold text-on-surface mb-5">
        When do you want to go?
      </h3>

      <div
        ref={stripRef}
        role="listbox"
        aria-label="Months to travel"
        aria-multiselectable="true"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className={cn(
          "flex gap-3 overflow-x-auto scroll-hide snap-x snap-mandatory",
          // Room for the focus ring and the hover lift, which would otherwise
          // be clipped by the scroll container.
          "px-1 py-2 -mx-1",
          "[--cards:2.3] sm:[--cards:4] lg:[--cards:6]",
        )}
      >
        {months.map((m, i) => {
          const isSelected = selected.includes(m.key);
          return (
            <button
              key={m.key}
              type="button"
              data-month={m.key}
              role="option"
              aria-selected={isSelected}
              aria-label={`${m.label} ${m.year}`}
              // Roving tabindex: one stop for the whole strip.
              tabIndex={i === focusIndex ? 0 : -1}
              onFocus={() => setFocusIndex(i)}
              onClick={() => onToggle(m.key)}
              className={cn(
                "shrink-0 snap-start rounded-2xl border p-4 md:p-5",
                "flex flex-col items-center justify-center gap-1.5",
                "transition-all duration-200 ease-out",
                "hover:-translate-y-0.5 hover:shadow-tinted active:scale-[0.98]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isSelected
                  ? "border-primary border-2 bg-primary-container text-on-primary-container shadow-tinted"
                  : "border-outline-variant/40 text-on-surface hover:border-on-surface",
              )}
              style={{
                // gap is 0.75rem; each card gives up its share so N fit exactly.
                flexBasis: "calc((100% - (var(--cards) - 1) * 0.75rem) / var(--cards))",
              }}
            >
              <CalendarDays
                aria-hidden
                className={cn(
                  "size-7 transition-colors",
                  isSelected ? "text-primary" : "text-on-surface-variant",
                )}
                strokeWidth={1.6}
              />
              <span className="text-sm font-semibold leading-tight">{m.label}</span>
              <span className="text-xs text-on-surface-variant">{m.year}</span>
            </button>
          );
        })}
      </div>

      {/* Announced to screen readers, which cannot see the highlighted cards. */}
      <p className="sr-only" role="status">
        {selected.length === 0
          ? "No months selected. Your search will cover any month."
          : `${selected.length} month${selected.length === 1 ? "" : "s"} selected.`}
      </p>
    </div>
  );
}
