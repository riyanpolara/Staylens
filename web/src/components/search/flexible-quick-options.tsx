"use client";

import { cn } from "@/lib/utils";
import {
  QUICK_OPTIONS,
  QUICK_OPTION_LABEL,
  type FlexibleQuickOption,
} from "@/components/search/flexible-search-state";

/**
 * Anytime / Next month / Next 3 months / Next 6 months.
 *
 * A preset sets the months; picking a month by hand afterwards clears the
 * preset, because the chip would otherwise keep claiming a range that is no
 * longer what is selected. That clearing happens in the parent, which owns both.
 */
export function FlexibleQuickOptions({
  value,
  onChange,
}: {
  value: FlexibleQuickOption | null;
  onChange: (next: FlexibleQuickOption) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Quick date ranges"
      className="flex flex-wrap justify-center gap-2"
    >
      {QUICK_OPTIONS.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            // Not a radio group: these are shortcuts that set the month
            // selection, and none of them stays true once months are edited.
            aria-pressed={selected}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200",
              "hover:scale-[1.03] active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              selected
                ? "border-primary bg-primary text-white"
                : "border-outline-variant/50 text-on-surface hover:border-on-surface",
            )}
          >
            {QUICK_OPTION_LABEL[opt]}
          </button>
        );
      })}
    </div>
  );
}
