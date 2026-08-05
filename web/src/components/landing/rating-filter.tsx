"use client";

import { Star } from "lucide-react";
import { LP } from "@/components/landing/landing-data";
import {
  RATING_FILTERS,
  RATING_FILTER_A11Y,
  RATING_FILTER_LABEL,
  type RatingFilter,
} from "@/lib/rating";

/**
 * "Filter by rating" chips for the AI-recommended shelf.
 *
 * A radio group, not a row of buttons: exactly one is always active, which is
 * what radio semantics mean, and it brings arrow-key movement between the chips
 * for free instead of hand-rolling a roving tabindex. The same choice the
 * flexible-search duration selector makes, for the same reason.
 *
 * Styled with the landing page's own `LP` tokens rather than the app's Tailwind
 * theme, because this section is the Premium handoff's visual language and a
 * `bg-primary` chip would not belong to it.
 */
export function RatingFilter({
  value,
  onChange,
  counts,
}: {
  value: RatingFilter;
  onChange: (next: RatingFilter) => void;
  /** How many recommendations each chip would show, for the accessible name. */
  counts: Record<RatingFilter, number>;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Filter recommendations by rating</legend>
      <div
        // Horizontally scrollable on mobile, where six chips do not fit. The
        // negative margin lets the row bleed to the screen edge so the last
        // chip is visibly cut off — the affordance that says "scroll me".
        className="flex gap-2.5 overflow-x-auto scroll-hide -mx-[8%] px-[8%] md:mx-0 md:px-0 md:flex-wrap py-1"
      >
        {RATING_FILTERS.map((f) => {
          const selected = value === f;
          const count = counts[f] ?? 0;
          // A chip with nothing behind it is a dead end — it can only ever
          // produce the empty state. Disabled rather than hidden, so the scale
          // still reads 5–4–3–2–1 and a band that has no stays today is
          // visibly a band that has no stays, not one that was never offered.
          const empty = count === 0;
          return (
            <label
              key={f}
              aria-disabled={empty || undefined}
              className="shrink-0 select-none rounded-full border font-bold text-[13px] px-[18px] py-[10px] inline-flex items-center gap-1.5 transition-all duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 aria-disabled:cursor-not-allowed hover:not-aria-disabled:-translate-y-0.5 active:not-aria-disabled:translate-y-0 cursor-pointer"
              style={{
                background: selected ? LP.green : "rgba(255,255,255,.75)",
                color: selected ? LP.goldSoft : LP.ink,
                borderColor: selected ? LP.green : "rgba(20,52,42,.15)",
                outlineColor: LP.green,
                opacity: empty ? 0.4 : 1,
              }}
            >
              <input
                type="radio"
                name="rating-filter"
                className="sr-only"
                checked={selected}
                disabled={empty}
                onChange={() => onChange(f)}
                // The count belongs in the name, not just on screen: "5★" alone
                // does not tell a screen-reader user the shelf is about to go
                // from twelve cards to three.
                aria-label={`${RATING_FILTER_A11Y[f]} (${count} ${
                  count === 1 ? "stay" : "stays"
                })`}
              />
              {f !== "all" && (
                <Star
                  aria-hidden
                  className="size-3"
                  style={{
                    color: selected ? LP.goldSoft : LP.gold,
                    fill: selected ? LP.goldSoft : LP.gold,
                  }}
                />
              )}
              {/* The label already carries "★", so it is hidden from the
                  accessible name above and shown visually only. */}
              <span aria-hidden>{RATING_FILTER_LABEL[f].replace("★", "")}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
