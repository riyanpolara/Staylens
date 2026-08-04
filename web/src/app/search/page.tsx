import { parseFlexibleQuery } from "@/components/search/flexible-search-state";
import type { Metadata } from "next";
import { SiteHeader, type InitialSearch } from "@/components/search/site-header";
import { FALLBACK_SUGGESTIONS } from "@/components/search/search-types";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Footer } from "@/components/layout/footer";
import { MapToggle } from "@/components/search-results/map-toggle";
import { SearchDesktop } from "@/components/search-results/desktop/search-desktop";
import { SearchMobile } from "@/components/search-results/mobile/search-mobile";
import { MobileHeader } from "@/components/search-results/mobile/mobile-header";
import {
  getSearchSuggestionList,
  searchStays,
  type SearchSort,
  type StaySearchResult,
} from "@/lib/queries";
import { searchStaysHybrid } from "@/lib/hybrid-search";
import type { StaySearchParams } from "@/lib/stay-filters";
import { nightsBetween, parseISODate } from "@/lib/calendar";
import { formatPrice } from "@/lib/currency";

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
    // Round-trips the flexible choice so reopening the panel shows the search
    // the results are actually for, rather than resetting to exact dates.
    flexible: parseFlexibleQuery((k) => str(sp[k]) ?? null),
  };

  // string-only params for pagination links
  const flatParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v.length) flatParams[k] = v;
  }

  const dates = datesLabel(str(sp.in), str(sp.out));
  const nights = nightsBetween(parseISODate(str(sp.in)), parseISODate(str(sp.out)));

  // carry the chosen dates + guests onto each property link so the detail
  // page opens with the booking card pre-filled (and still editable there),
  // plus the query itself so the detail page can re-derive this property's AI
  // Match. The score is deliberately NOT put in the URL — a number the guest
  // can edit is not a number we can stand behind.
  const bookingQs = new URLSearchParams();
  if (where) bookingQs.set("where", where);
  if ((num(sp.page) ?? 1) > 1) bookingQs.set("page", String(num(sp.page)));
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
        ? `${formatPrice(s.price * nights)} for ${nights} night${nights === 1 ? "" : "s"}`
        : `${formatPrice(s.price)} / night`,
  }));

  return (
    <>
      {/* ── Desktop / tablet header (≥768px): compact morphing search bar ── */}
      <div className="hidden md:block">
        <SiteHeader
          suggestions={suggestions}
          initialSearch={initialSearch}
          defaultCollapsed
        />
      </div>

      {/* ── Mobile header (<768px): back · compact search · filters ── */}
      <MobileHeader suggestions={suggestions} initialSearch={initialSearch} />

      {/* ── Desktop / tablet layout: split list + sticky map ── */}
      <SearchDesktop
        results={results}
        where={where}
        dates={dates}
        nights={nights}
        hrefQuery={hrefQuery}
        flatParams={flatParams}
        pins={pins}
      />

      {/* ── Mobile layout: single-column Airbnb-style feed ── */}
      <SearchMobile
        results={results}
        where={where}
        dates={dates}
        nights={nights}
        hrefQuery={hrefQuery}
        flatParams={flatParams}
      />

      {/* floating map button — tablet + mobile (desktop uses the split map) */}
      <div className="lg:hidden">
        <MapToggle pins={pins} hrefQuery={hrefQuery} />
      </div>

      <Footer />
      <MobileNav active="Explore" />
    </>
  );
}
