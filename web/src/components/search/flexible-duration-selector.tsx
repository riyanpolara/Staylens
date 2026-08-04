"use client";

import { cn } from "@/lib/utils";
import {
  DURATIONS,
  DURATION_META,
  type FlexibleDuration,
} from "@/components/search/flexible-search-state";

/**
 * "How long would you like to stay?" — Weekend / Week / Month.
 *
 * A radio group rather than buttons: exactly one is always chosen, which is what
 * radio semantics mean, and it gives arrow-key movement between the options for
 * free instead of hand-rolling it.
 */
export function FlexibleDurationSelector({
  value,
  onChange,
}: {
  value: FlexibleDuration;
  onChange: (next: FlexibleDuration) => void;
}) {
  return (
    <fieldset>
      <legend className="block w-full text-center font-display text-xl md:text-2xl font-semibold text-on-surface mb-5">
        How long would you like to stay?
      </legend>

      <div className="flex flex-wrap justify-center gap-3">
        {DURATIONS.map((d) => {
          const meta = DURATION_META[d];
          const selected = value === d;
          return (
            <label
              key={d}
              className={cn(
                "cursor-pointer select-none rounded-full border px-5 py-3 text-center transition-all duration-200",
                "hover:scale-[1.03] active:scale-[0.98]",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
                selected
                  ? "border-primary bg-primary-container text-on-primary-container shadow-tinted"
                  : "border-outline-variant/50 text-on-surface hover:border-on-surface",
              )}
            >
              <input
                type="radio"
                name="flexible-duration"
                className="sr-only"
                checked={selected}
                onChange={() => onChange(d)}
              />
              <span className="block text-sm font-semibold">{meta.label}</span>
              {/* The rule, not just the word — "Month" alone does not tell a
                  guest it means 28 nights or more. */}
              <span className="block text-xs text-on-surface-variant mt-0.5">
                {meta.hint}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
