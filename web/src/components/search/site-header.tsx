"use client";

import Link from "next/link";
import { Search, TreePine } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { searchHref } from "@/lib/search-query";
import {
  EMPTY_FLEXIBLE,
  type FlexibleSearch,
} from "@/components/search/flexible-search-state";
import { SearchBar } from "@/components/search/search-bar";

// Mobile-only, opened on tap — keep it out of the shared header bundle.
const MobileSearch = dynamic(
  () => import("@/components/search/mobile-search").then((m) => m.MobileSearch),
  { ssr: false },
);
import { CompactSearch } from "@/components/search/compact-search";
import { UserMenu } from "@/components/search/user-menu";
import {
  WherePanel,
  WhenPanel,
  WhoPanel,
} from "@/components/search/search-panels";
import {
  EMPTY_SEARCH,
  FALLBACK_SUGGESTIONS,
  type DestinationSuggestion,
  type SearchField,
  type SearchState,
} from "@/components/search/search-types";

const SPRING = { type: "spring", stiffness: 400, damping: 34 } as const;

/**
 * Header replicating the video's Airbnb behavior:
 *  - at top: nav row + expanded search bar BELOW it
 *  - on scroll: the bar morphs into a compact pill inside the nav row
 *    (shared layoutId), nav links fade out
 *  - clicking the pill morphs the bar back open (with a page backdrop)
 *  - Where / When / Who open dropdown panels under their segment
 */
/** Serializable initial query (from /search URL params). */
export type InitialSearch = {
  where?: string;
  checkIn?: string | null; // yyyy-mm-dd
  checkOut?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  /** Parsed from the /search URL, so the panel reopens on the right tab. */
  flexible?: FlexibleSearch;
};

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function SiteHeader({
  suggestions = FALLBACK_SUGGESTIONS,
  initialSearch,
  defaultCollapsed = false,
  overlay = false,
}: {
  suggestions?: DestinationSuggestion[];
  initialSearch?: InitialSearch;
  /** results page starts with the compact pill (video behavior) */
  defaultCollapsed?: boolean;
  /**
   * landing page: header floats transparently over the hero carousel at
   * scroll-top (image shows through), regaining its glass surface on scroll.
   * The search bar itself is unchanged.
   */
  overlay?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState<SearchState>(() =>
    initialSearch
      ? {
          where: initialSearch.where ?? "",
          checkIn: parseDate(initialSearch.checkIn),
          checkOut: parseDate(initialSearch.checkOut),
          guests: {
            adults: initialSearch.adults ?? 0,
            children: initialSearch.children ?? 0,
            infants: initialSearch.infants ?? 0,
            pets: initialSearch.pets ?? 0,
          },
          // Carried through from the /search URL so re-opening the panel shows
          // the flexible choice the results are actually for.
          flexible: initialSearch.flexible ?? EMPTY_FLEXIBLE,
        }
      : EMPTY_SEARCH,
  );
  const [active, setActive] = useState<SearchField | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [override, setOverride] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const openScrollY = useRef(0);
  const { scrollY } = useScroll();

  // on results pages the bar is collapsed by default, even at scroll top
  const expanded = (!scrolled && !defaultCollapsed) || override;
  // transparent-over-hero mode (landing): only while at the very top
  const overlayActive = overlay && !scrolled && !override;

  useMotionValueEvent(scrollY, "change", (y) => {
    // hysteresis avoids flicker at the boundary
    setScrolled((s) => (s ? y > 24 : y > 72));
    // scrolling away closes an override-expanded bar (like the video)
    if (override && Math.abs(y - openScrollY.current) > 40) {
      setOverride(false);
      setActive(null);
    }
  });

  const close = useCallback(() => {
    setActive(null);
    setOverride(false);
  }, []);

  // click outside + Escape close the panel / collapse the override
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [close]);

  // external trigger (the landing "Try AI Search" CTA): smooth-scroll up to the
  // hero and open the search. On desktop, activating the "where" field expands
  // the bar and opens the Suggested destinations panel (SearchBar also focuses
  // the input) — the final state matches the design. Mobile has no over-hero
  // bar, so it opens the full-screen search sheet instead.
  useEffect(() => {
    function openSearch() {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (window.matchMedia("(min-width: 768px)").matches) {
        setActive("where");
      } else {
        setMobileOpen(true);
      }
    }
    window.addEventListener("staylens:open-search", openSearch);
    return () => window.removeEventListener("staylens:open-search", openSearch);
  }, []);

  function openFromPill(field: SearchField) {
    openScrollY.current = scrollY.get();
    setOverride(true);
    setActive(field);
  }

  function handleWherePick(label: string) {
    setSearch((s) => ({ ...s, where: label }));
    setActive("when"); // advance to dates, like the video
  }

  function handleSubmit() {
    setActive(null);
    setOverride(false);
    setMobileOpen(false);
    router.push(searchHref(search));
  }

  return (
    <>
      {/* page backdrop when the bar is re-expanded over content (video behavior) */}
      <AnimatePresence>
        {override && (scrolled || defaultCollapsed) && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-on-surface/30 z-50"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <motion.header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-[60] border-b transition-colors duration-300",
          overlayActive
            ? "bg-transparent border-transparent"
            : "glass-header bg-surface/95 border-outline-variant/30",
          scrolled && !override && "shadow-sm",
        )}
      >
        <LayoutGroup>
          <div className="relative max-w-[1280px] mx-auto px-4 md:px-16">
            {/* ---- Row 1: logo · nav-links/compact-pill · actions ---- */}
            <div className="relative flex justify-between items-center h-20">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 shrink-0"
                aria-label="Staylens home"
              >
                <TreePine
                  aria-hidden
                  className={cn(
                    "size-8 transition-colors duration-300",
                    overlayActive ? "text-white drop-shadow-md" : "text-primary",
                  )}
                  strokeWidth={1.8}
                />
                <span
                  className={cn(
                    "font-display text-2xl font-bold tracking-tight hidden sm:inline transition-colors duration-300",
                    overlayActive ? "text-white drop-shadow-md" : "text-primary",
                  )}
                >
                  Staylens
                </span>
              </Link>

              {/* center: compact search pill (shown only when collapsed) */}
              <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
                <AnimatePresence initial={false}>
                  {!expanded && (
                    <motion.div
                      key="pill"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <CompactSearch
                        state={search}
                        onOpen={openFromPill}
                        whereLabelPrefix={defaultCollapsed ? "Homes in " : undefined}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <UserMenu light={overlayActive} />
            </div>

            {/* ---- Row 2: expanded search bar (desktop) ---- */}
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="bar-row"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SPRING}
                  className="hidden md:block overflow-visible"
                >
                  <motion.div
                    layoutId="search-shell"
                    transition={SPRING}
                    className="relative flex justify-center pb-5"
                  >
                    <SearchBar
                      state={search}
                      active={active}
                      onActivate={setActive}
                      onWhereInput={(v) => setSearch((s) => ({ ...s, where: v }))}
                      onClear={(field) =>
                        setSearch((s) =>
                          field === "where"
                            ? { ...s, where: "" }
                            : field === "when"
                              ? { ...s, checkIn: null, checkOut: null }
                              : { ...s, guests: { adults: 0, children: 0, infants: 0, pets: 0 } },
                        )
                      }
                      onSubmit={handleSubmit}
                    />

                    {/* dropdown panels under their segment */}
                    <AnimatePresence>
                      {active && (
                        <motion.div
                          key={active}
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          transition={{ duration: 0.2, ease: [0.21, 0.65, 0.36, 1] }}
                          className={cn(
                            "absolute top-full mt-3 bg-surface-container-lowest rounded-[32px] shadow-tinted-lg border border-outline-variant/20 z-20",
                            active === "where" && "left-1/2 -translate-x-[400px]",
                            active === "when" && "left-1/2 -translate-x-1/2",
                            active === "who" && "left-1/2 translate-x-[24px]",
                          )}
                        >
                          {active === "where" && (
                            <WherePanel
                              suggestions={suggestions}
                              query={search.where}
                              onPick={handleWherePick}
                            />
                          )}
                          {active === "when" && (
                            <WhenPanel
                              state={search}
                              onChange={(next) => setSearch((s) => ({ ...s, ...next }))}
                            />
                          )}
                          {active === "who" && (
                            <WhoPanel
                              guests={search.guests}
                              onChange={(guests) => setSearch((s) => ({ ...s, guests }))}
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ---- Mobile: single tap-friendly pill → full-screen sheet ---- */}
            <div className="md:hidden pb-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="w-full h-12 rounded-full bg-surface-container-lowest border border-outline-variant/30 shadow-tinted flex items-center gap-3 px-4"
                aria-label="Start your search"
                aria-haspopup="dialog"
                aria-expanded={mobileOpen}
              >
                <Search aria-hidden className="size-4 text-primary" strokeWidth={2.4} />
                <span className="text-sm font-semibold text-on-surface">
                  {search.where || "Start your search"}
                </span>
              </button>
            </div>
          </div>
        </LayoutGroup>
      </motion.header>

      {/* mobile full-screen search sheet (reuses the desktop When/Who panels) */}
      {mobileOpen && (
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
          onSubmit={handleSubmit}
          onClose={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
