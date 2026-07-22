import type { Metadata } from "next";
import { SiteHeader, type InitialSearch } from "@/components/search/site-header";
import { FALLBACK_SUGGESTIONS } from "@/components/search/search-types";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Footer } from "@/components/layout/footer";
import { PropertyCard } from "@/components/explore/property-card";
import { Reveal } from "@/components/shared/reveal";
import { FiltersBar } from "@/components/search-results/filters-bar";
import { SortSelect } from "@/components/search-results/sort-select";
import { Pagination } from "@/components/search-results/pagination";
import { MapToggle } from "@/components/search-results/map-toggle";
import { ResultsMap } from "@/components/search-results/results-map";
import {
  getSearchSuggestionList,
  searchStays,
  type SearchSort,
  type StaySearchResult,
} from "@/lib/queries";
import { searchStaysHybrid } from "@/lib/hybrid-search";
import type { StaySearchParams } from "@/lib/stay-filters";
import { nightsBetween, parseISODate } from "@/lib/calendar";

type SP = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length ? v : undefined;
}
function num(v: string | string[] | undefined): number | undefined {
  const n = Number(str(v));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const DATE_FMT = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });
function datesLabel(inStr?: string, outStr?: string): string | undefined {
  if (!inStr || !outStr) return undefined;
  const [a, b] = [new Date(inStr), new Date(outStr)];
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return undefined;
  return `${DATE_FMT.format(a)} – ${DATE_FMT.format(b)}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const where = str(sp.where);
  return {
    title: where ? `Stays in ${where}` : "Search stays",
    description: `Browse luxury nature stays${where ? ` in ${where}` : ""} on Staylens.`,
  };
}

/**
 * Search Results screen — Stitch design + video pass 2: compact-first
 * header, quick-filter bar with Filters modal, split list/map layout.
 * Server-rendered: every filter, sort and page lives in the URL.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const where = str(sp.where);
  const guests = (num(sp.adults) ?? 0) + (num(sp.children) ?? 0);

  const searchParamsObj: StaySearchParams = {
    where,
    guests: guests || undefined,
    price: str(sp.price),
    type: str(sp.type),
    beds: num(sp.beds),
    bath: num(sp.bath),
    amenities: (str(sp.am) ?? "").split(",").filter(Boolean),
    ptype: str(sp.ptype),
    fav: str(sp.fav) === "1",
    luxe: str(sp.luxe) === "1",
    sort: (str(sp.sort) as SearchSort) ?? "recommended",
    page: num(sp.page) ?? 1,
  };

  // Hybrid Search API (semantic + FTS + filters + ranking) with a
  // direct-Supabase fallback if the backend is unreachable.
  let results: StaySearchResult;
  try {
    results =
      (await searchStaysHybrid(searchParamsObj)) ?? (await searchStays(searchParamsObj));
  } catch (err) {
    console.error("[search] search failed:", err);
    results = { items: [], total: 0, page: 1, perPage: 24, totalPages: 1 };
  }

  let suggestions = FALLBACK_SUGGESTIONS;
  try {
    suggestions = await getSearchSuggestionList();
  } catch {
    /* fallback stays */
  }

  const initialSearch: InitialSearch = {
    where,
    checkIn: str(sp.in) ?? null,
    checkOut: str(sp.out) ?? null,
    adults: num(sp.adults),
    children: num(sp.children),
    infants: num(sp.infants),
    pets: num(sp.pets),
  };

  // string-only params for pagination links
  const flatParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v.length) flatParams[k] = v;
  }

  const dates = datesLabel(str(sp.in), str(sp.out));
  const nights = nightsBetween(parseISODate(str(sp.in)), parseISODate(str(sp.out)));

  // carry the chosen dates + guests onto each property link so the detail
  // page opens with the booking card pre-filled (and still editable there)
  const bookingQs = new URLSearchParams();
  if (str(sp.in)) bookingQs.set("in", str(sp.in)!);
  if (str(sp.out)) bookingQs.set("out", str(sp.out)!);
  for (const k of ["adults", "children", "infants"] as const) {
    const v = str(sp[k]);
    if (v) bookingQs.set(k, v);
  }
  const hrefQuery = bookingQs.size ? `?${bookingQs.toString()}` : "";

  // map pins carry everything the popup card renders (photo, rating, beds, price)
  const pins = results.items.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    latitude: s.latitude,
    longitude: s.longitude,
    image: s.images[0]?.url ?? null,
    location: s.location,
    rating: s.rating,
    reviews: s.reviews,
    beds: s.beds ?? null,
    bathrooms: s.bathrooms ?? null,
    priceLabel:
      nights > 0
        ? `$${(s.price * nights).toLocaleString()} for ${nights} night${nights === 1 ? "" : "s"}`
        : `$${s.price.toLocaleString()} / night`,
  }));

  return (
    <>
      {/* video behavior: results page header starts as the compact pill */}
      <SiteHeader
        suggestions={suggestions}
        initialSearch={initialSearch}
        defaultCollapsed
      />
      <main
        id="main-content"
        className="pt-[144px] md:pt-[88px] max-w-[1400px] mx-auto px-4 md:px-10 pb-16"
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

        {/* mobile keeps the FAB + full-screen overlay */}
        <div className="lg:hidden">
          <MapToggle pins={pins} hrefQuery={hrefQuery} />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
