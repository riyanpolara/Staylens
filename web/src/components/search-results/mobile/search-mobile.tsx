import { Reveal } from "@/components/shared/reveal";
import { SortSelect } from "@/components/search-results/sort-select";
import { Pagination } from "@/components/search-results/pagination";
import { MobileFilters } from "@/components/search-results/mobile/mobile-filters";
import { MobileCard } from "@/components/search-results/mobile/mobile-card";
import type { StaySearchResult } from "@/lib/queries";

/**
 * Dedicated mobile results layout (<768px): sticky snap-scroll filter chips,
 * a compact heading + sort, and a single-column feed of Airbnb-style cards.
 * No side-by-side map (that's a floating button in page.tsx). The fixed
 * MobileHeader (top) and BottomNav (bottom) are rendered by page.tsx, so this
 * pads for both. Same server-fetched data as the desktop tree.
 */
export function SearchMobile({
  results,
  where,
  dates,
  nights,
  hrefQuery,
  flatParams,
}: {
  results: StaySearchResult;
  where?: string;
  dates?: string;
  nights: number;
  hrefQuery: string;
  flatParams: Record<string, string>;
}) {
  const heading =
    results.total >= 1000
      ? `Over ${Math.floor(results.total / 1000) * 1000} homes`
      : `${results.total.toLocaleString()} homes`;

  return (
    <main
      className="md:hidden pt-[calc(env(safe-area-inset-top)+4rem)] pb-28 min-h-screen"
      aria-label="Search results"
    >
      <MobileFilters />

      <div className="px-4">
        <div className="flex items-center justify-between gap-3 py-4">
          <h1 className="font-display text-lg font-bold text-on-surface truncate">
            {heading}
            {where ? ` ${results.wherePreposition ?? "in"} ${where}` : ""}
          </h1>
          <SortSelect />
        </div>

        {results.items.length > 0 ? (
          <section className="flex flex-col gap-5">
            {results.items.map((stay, i) => (
              <Reveal key={stay.id} index={Math.min(i, 3)}>
                <MobileCard
                  stay={stay}
                  datesLabel={dates}
                  nights={nights}
                  hrefQuery={hrefQuery}
                />
              </Reveal>
            ))}
          </section>
        ) : (
          <section className="py-20 text-center">
            <h2 className="font-display text-lg font-semibold mb-2">
              No exact matches
            </h2>
            <p className="text-on-surface-variant text-sm">
              Try changing or removing some of your filters
              {where ? ` — or searching beyond ${where}` : ""}.
            </p>
          </section>
        )}

        <Pagination
          page={results.page}
          totalPages={results.totalPages}
          params={flatParams}
        />
      </div>
    </main>
  );
}
