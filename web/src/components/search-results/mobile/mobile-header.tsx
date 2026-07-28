"use client";

import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";

// Both are click-triggered overlays — split them out of the initial bundle.
const MobileSearch = dynamic(
  () => import("@/components/search/mobile-search").then((m) => m.MobileSearch),
  { ssr: false },
);
const FiltersModal = dynamic(
  () => import("@/components/search-results/filters-modal").then((m) => m.FiltersModal),
  { ssr: false },
);
import { useAmenityFilters } from "@/components/search-results/use-amenity-filters";
import {
  formatGuests,
  formatWhen,
  type DestinationSuggestion,
  type SearchState,
} from "@/components/search/search-types";
import { searchHref, seedSearchState, type SeedSearch } from "@/lib/search-query";

/**
 * Dedicated mobile search header (<768px): back button · compact search pill ·
 * filter icon. The pill opens the full-screen MobileSearch sheet; the filter
 * icon opens the shared FiltersModal. Fixed to the top; MobileFilters sticks
 * directly beneath it. Replaces the global SiteHeader on the mobile results
 * layout (SiteHeader still serves ≥768px).
 */
export function MobileHeader({
  suggestions,
  initialSearch,
}: {
  suggestions: DestinationSuggestion[];
  initialSearch?: SeedSearch;
}) {
  const router = useRouter();
  const { modalCount } = useAmenityFilters();
  const [search, setSearch] = useState<SearchState>(() =>
    seedSearchState(initialSearch),
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  function submit() {
    setSearchOpen(false);
    router.push(searchHref(search));
  }

  const summary = `${formatWhen(search, "Any week")} · ${formatGuests(search, "Add guests")}`;

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-[60] glass-header bg-surface/95 border-b border-outline-variant/30 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 h-16 px-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="grid place-items-center w-11 h-11 -ml-2 rounded-full text-on-surface active:scale-95 transition-transform"
          >
            <ArrowLeft aria-hidden className="size-5" />
          </button>

          {/* compact search pill → full-screen sheet */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Edit search"
            aria-haspopup="dialog"
            className="flex-1 min-w-0 flex items-center gap-3 h-11 rounded-full bg-surface-container-lowest border border-outline-variant/40 shadow-tinted px-4"
          >
            <Search aria-hidden className="size-4 text-primary shrink-0" strokeWidth={2.4} />
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold text-on-surface truncate">
                {search.where || "Start your search"}
              </span>
              <span className="block text-[11px] text-on-surface-variant truncate -mt-0.5">
                {summary}
              </span>
            </span>
          </button>

          {/* filter icon → full modal, with active-count dot */}
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label={modalCount > 0 ? `Filters, ${modalCount} active` : "Filters"}
            aria-haspopup="dialog"
            className="relative grid place-items-center w-11 h-11 rounded-full border border-outline-variant/60 text-on-surface active:scale-95 transition-transform"
          >
            <SlidersHorizontal aria-hidden className="size-5" />
            {modalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-primary text-white text-[10px] font-bold">
                {modalCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {searchOpen && (
        <MobileSearch
          suggestions={suggestions}
          state={search}
          onWhereInput={(v) => setSearch((s) => ({ ...s, where: v }))}
          onWherePick={(label) => setSearch((s) => ({ ...s, where: label }))}
          onWhenChange={(next) => setSearch((s) => ({ ...s, ...next }))}
          onWhoChange={(guests) => setSearch((s) => ({ ...s, guests }))}
          onClear={() =>
            setSearch((s) => ({
              ...s,
              where: "",
              checkIn: null,
              checkOut: null,
              guests: { adults: 0, children: 0, infants: 0, pets: 0 },
            }))
          }
          onSubmit={submit}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {filtersOpen && <FiltersModal onClose={() => setFiltersOpen(false)} />}
    </>
  );
}
