"use client";

import { Bath, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FiltersModal } from "@/components/search-results/filters-modal";
import { QUICK_FILTERS } from "@/components/search-results/filter-config";
import { useAmenityFilters } from "@/components/search-results/use-amenity-filters";

/**
 * Sticky quick-filter bar (video pass 2): outlined "Filters" button that
 * opens the full modal, a divider, then one-click amenity toggles and the
 * "1+ bathrooms" pill. All state lives in the URL (server-filtered).
 *
 * Desktop/tablet only — the mobile layout uses MobileFilters. Both share the
 * toggle logic via useAmenityFilters().
 */
export function FiltersBar() {
  const { activeAmenities, bathActive, modalCount, toggleAmenity, toggleBath } =
    useAmenityFilters();
  const [modalOpen, setModalOpen] = useState(false);

  const pillClass = (active: boolean) =>
    cn(
      "flex shrink-0 items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all active:scale-95",
      active
        ? "bg-primary-fixed/50 text-on-primary-fixed-variant border-primary"
        : "bg-surface-container-lowest border-outline-variant hover:border-primary hover:text-primary",
    );

  return (
    <section
      aria-label="Filters"
      className="sticky top-20 bg-surface/80 glass-header py-4 z-40"
    >
      <div className="flex items-center gap-2 overflow-x-auto scroll-hide pb-1">
        {/* outlined Filters button — opens the modal (video behavior) */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-haspopup="dialog"
          className={cn(
            "flex shrink-0 items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all active:scale-95",
            modalCount > 0
              ? "border-primary text-primary bg-primary-fixed/30"
              : "bg-surface-container-lowest border-outline-variant hover:border-primary hover:text-primary",
          )}
        >
          <SlidersHorizontal aria-hidden className="size-4" />
          {modalCount > 0 ? `Filters · ${modalCount}` : "Filters"}
        </button>
        <span aria-hidden className="h-8 w-px bg-outline-variant mx-1 shrink-0" />

        {QUICK_FILTERS.map(({ slug, label, icon: Icon }) => (
          <button
            key={slug}
            type="button"
            aria-pressed={activeAmenities.has(slug)}
            onClick={() => toggleAmenity(slug)}
            className={pillClass(activeAmenities.has(slug))}
          >
            <Icon aria-hidden className="size-4" strokeWidth={1.9} />
            {label}
          </button>
        ))}

        <button
          type="button"
          aria-pressed={bathActive}
          onClick={toggleBath}
          className={pillClass(bathActive)}
        >
          <Bath aria-hidden className="size-4" strokeWidth={1.9} />
          1+ bathrooms
        </button>
      </div>

      {modalOpen && <FiltersModal onClose={() => setModalOpen(false)} />}
    </section>
  );
}
