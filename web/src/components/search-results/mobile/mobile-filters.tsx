"use client";

import { Bath } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUICK_FILTERS } from "@/components/search-results/filter-config";
import { useAmenityFilters } from "@/components/search-results/use-amenity-filters";

/**
 * Mobile amenity chips — horizontally scrollable with snap points and a hidden
 * scrollbar (Airbnb-style). The full Filters modal is opened from the header's
 * filter icon; these chips are the one-tap amenity toggles. URL-driven state is
 * shared with the desktop FiltersBar via useAmenityFilters().
 */
export function MobileFilters() {
  const { activeAmenities, bathActive, toggleAmenity, toggleBath } =
    useAmenityFilters();

  const chip = (active: boolean) =>
    cn(
      "snap-start flex shrink-0 items-center gap-2 px-4 h-11 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors active:scale-95",
      active
        ? "bg-primary-fixed/50 text-on-primary-fixed-variant border-primary"
        : "bg-surface-container-lowest border-outline-variant",
    );

  return (
    <div className="sticky top-16 z-30 bg-surface/90 glass-header border-b border-outline-variant/15">
      <div className="flex items-center gap-2 overflow-x-auto scroll-hide snap-x snap-mandatory px-4 py-2.5">
        {QUICK_FILTERS.map(({ slug, label, icon: Icon }) => (
          <button
            key={slug}
            type="button"
            aria-pressed={activeAmenities.has(slug)}
            onClick={() => toggleAmenity(slug)}
            className={chip(activeAmenities.has(slug))}
          >
            <Icon aria-hidden className="size-4" strokeWidth={1.9} />
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={bathActive}
          onClick={toggleBath}
          className={chip(bathActive)}
        >
          <Bath aria-hidden className="size-4" strokeWidth={1.9} />
          1+ bathrooms
        </button>
      </div>
    </div>
  );
}
