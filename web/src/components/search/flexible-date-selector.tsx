"use client";

import { FlexibleDurationSelector } from "@/components/search/flexible-duration-selector";
import { FlexibleQuickOptions } from "@/components/search/flexible-quick-options";
import { FlexibleMonthCarousel } from "@/components/search/flexible-month-carousel";
import {
  monthsForQuickOption,
  toggleMonth,
  type FlexibleDuration,
  type FlexibleQuickOption,
  type FlexibleSearch,
} from "@/components/search/flexible-search-state";

/**
 * The Flexible tab: duration, quick ranges, and the month strip.
 *
 * This is the only place the three know about each other, and there is exactly
 * one rule between them: a preset sets the months, and editing the months by
 * hand clears the preset. Without that, "Next 3 months" would stay highlighted
 * while the selection said something else — the chip would be lying.
 *
 * It holds no state of its own. Everything lives in `SearchState.flexible`, so
 * the choice survives closing the panel and is available at submit.
 */
export function FlexibleDateSelector({
  value,
  onChange,
}: {
  value: FlexibleSearch;
  onChange: (next: Partial<FlexibleSearch>) => void;
}) {
  function setDuration(duration: FlexibleDuration) {
    onChange({ duration });
  }

  function applyQuickOption(quickOption: FlexibleQuickOption) {
    onChange({ quickOption, months: monthsForQuickOption(quickOption) });
  }

  function toggle(key: string) {
    // Hand-editing invalidates the preset — see the note above.
    onChange({ months: toggleMonth(value.months, key), quickOption: null });
  }

  return (
    <div className="flex flex-col gap-8 py-2">
      <FlexibleDurationSelector value={value.duration} onChange={setDuration} />

      <div className="flex flex-col gap-5">
        <FlexibleMonthCarousel selected={value.months} onToggle={toggle} />
        <FlexibleQuickOptions value={value.quickOption} onChange={applyQuickOption} />
      </div>
    </div>
  );
}
