import { PropertyCard } from "@/components/explore/property-card";
import { Reveal } from "@/components/shared/reveal";
import { FiltersBar } from "@/components/search-results/filters-bar";
import { SortSelect } from "@/components/search-results/sort-select";
import { Pagination } from "@/components/search-results/pagination";
import { ResultsMap } from "@/components/search-results/results-map";
import type { StaySearchResult } from "@/lib/queries";
import type { MapPinInput } from "@/lib/map-pins";

/**
 * Desktop + tablet search layout (≥768px). Unchanged from the original
 * single-tree page: split list/map at ≥1024px, 2-column cards on tablet with
 * the sticky map hidden (ResultsMap is `hidden lg:block`; the floating map
 * button in page.tsx covers tablet). Kept byte-for-byte so desktop stays
 * pixel-perfect — the mobile experience lives in a separate tree.
 */
export function SearchDesktop({
  results,
  where,
  dates,
  nights,
  hrefQuery,
  flatParams,
  pins,
}: {
  results: StaySearchResult;
  where?: string;
  dates?: string;
  nights: number;
  hrefQuery: string;
  flatParams: Record<string, string>;
  pins: MapPinInput[];
}) {
  return (
    <main
      id="main-content"
      className="hidden md:block pt-[88px] max-w-[1400px] mx-auto px-4 md:px-10 pb-16"
    >
      <FiltersBar />

      {/* split layout: results left, persistent map right (desktop) */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,42%)] lg:gap-6 mt-2">
        <div>
          <header className="mb-4 md:mb-6 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-base md:text-2xl font-semibold text-on-surface truncate">
                {results.total >= 1000
                  ? `Over ${Math.floor(results.total / 1000) * 1000} homes`
                  : `${results.total.toLocaleString()} homes`}
                {where ? ` ${results.wherePreposition ?? "in"} ${where}` : ""}
              </h1>
              <p className="hidden md:block text-on-surface-variant mt-1 text-sm">
                Luxury stays nestled in nature&apos;s finest corners.
              </p>
            </div>
            <SortSelect />
          </header>

          {results.items.length > 0 ? (
            <section
              aria-label="Search results"
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6"
            >
              {results.items.map((stay, i) => (
                <Reveal key={stay.id} index={i % 4}>
                  <PropertyCard
                    stay={stay}
                    variant="result"
                    datesLabel={dates}
                    nights={nights}
                    hrefQuery={hrefQuery}
                  />
                </Reveal>
              ))}
            </section>
          ) : (
            <section className="py-24 text-center">
              <h2 className="font-display text-xl font-semibold mb-2">
                No exact matches
              </h2>
              <p className="text-on-surface-variant">
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

        <ResultsMap pins={pins} locationLabel={where} hrefQuery={hrefQuery} />
      </div>
    </main>
  );
}
