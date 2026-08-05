"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import { ChevronLeft, ChevronRight, Sparkles, Star } from "lucide-react";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { useMemo, useRef, useState } from "react";
import { Reveal } from "@/components/shared/reveal";
import { LP } from "@/components/landing/landing-data";
import type { ExploreStay } from "@/lib/queries";
import { RatingFilter as RatingFilterChips } from "@/components/landing/rating-filter";
import {
  RATING_FILTERS,
  formatRating,
  matchesRatingFilter,
  ratingLabel,
  type RatingFilter,
} from "@/lib/rating";

/**
 * design-style "AI match" derived from the real rating (display only)
 *
 * Unchanged. An unrated stay has nothing to derive from, so it gets no match
 * badge at all rather than a figure computed from a stand-in zero.
 */
function matchPct(rating: number): number {
  return Math.min(99, Math.round(86 + rating * 2.4));
}

/**
 * The card photo, with the placeholder as its fallback.
 *
 * `getRecommendedStays` already drops listings whose photo 404s, but that check
 * runs behind an hourly cache and these are Airbnb CDN URLs that expire on
 * their own schedule. Without an `onError` the failure mode is the worst one
 * available: the browser paints the broken-image icon and the alt text, so the
 * card reads as a wall of the listing's own title.
 *
 * Falling back to the same tone the no-photo case uses means a rotted URL costs
 * the card its picture and nothing else.
 */
function CardImage({ stay }: { stay: ExploreStay }) {
  const [failed, setFailed] = useState(false);
  const src = stay.images[0]?.url;

  if (!src || failed) {
    return <div className="absolute inset-0" style={{ background: LP.creamAlt }} />;
  }
  return (
    <Image
      src={src}
      alt={stay.name}
      fill
      unoptimized={src.includes("muscache")}
      sizes="380px"
      onError={() => setFailed(true)}
      className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-110"
    />
  );
}

/**
 * "AI-recommended retreats" — horizontal scroll-snap carousel of LIVE top
 * stays. Cards open the property in a new tab (app convention).
 */
export function RecommendedCarousel({ stays }: { stays: ExploreStay[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) =>
    scrollRef.current?.scrollBy({ left: dir * 406, behavior: "smooth" });

  // Local state, not a URL param. The homepage is statically rendered and
  // reading searchParams here would opt the whole route into dynamic rendering
  // to power one client-side filter — a real cost for no gain, and the kind of
  // routing change the brief asks not to introduce.
  const [filter, setFilter] = useState<RatingFilter>("all");

  // In-memory, so a chip never refetches. `stays` is the already-generated
  // recommendation list: filtering happens after recommendation, and preserves
  // its order, so nothing here can reorder or rescore the shelf.
  const visible = useMemo(
    () => stays.filter((s) => matchesRatingFilter(s.rating, filter)),
    [stays, filter],
  );

  // Counts for every chip, so the labels can say what each one would show.
  const counts = useMemo(() => {
    const out = {} as Record<RatingFilter, number>;
    for (const f of RATING_FILTERS) {
      out[f] = stays.filter((s) => matchesRatingFilter(s.rating, f)).length;
    }
    return out;
  }, [stays]);

  if (stays.length === 0) return null;

  return (
    <section className="py-[90px] md:py-[130px]" aria-labelledby="rec-heading">
      <div className="max-w-[1500px] mx-auto px-[8%] flex items-end justify-between mb-[54px] flex-wrap gap-5">
        <Reveal>
          <div>
            <div className="font-bold tracking-[3px] text-[13px] uppercase mb-4" style={{ color: LP.gold }}>
              Matched For You
            </div>
            <h2
              id="rec-heading"
              className="text-4xl md:text-[56px] md:leading-[1.05] font-semibold m-0"
              style={{ fontFamily: "var(--font-cormorant)", color: LP.ink, letterSpacing: "-1px" }}
            >
              AI-recommended retreats
            </h2>
            <div className="mt-6">
              <RatingFilterChips value={filter} onChange={setFilter} counts={counts} />
            </div>
          </div>
        </Reveal>
        <div className="flex gap-3">
          {[
            { dir: -1, label: "Scroll back", Icon: ChevronLeft },
            { dir: 1, label: "Scroll forward", Icon: ChevronRight },
          ].map(({ dir, label, Icon }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => scrollBy(dir)}
              className="w-14 h-14 rounded-full bg-white cursor-pointer flex items-center justify-center border transition-colors duration-300 hover:bg-[#f0efe8]"
              style={{ borderColor: "rgba(20,52,42,.15)" }}
            >
              <Icon aria-hidden className="size-5" style={{ color: LP.green }} strokeWidth={2.4} />
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        /* Reachable: the shelf holds no credibly-rated stay below 3.0, so a
           narrow filter can legitimately empty it. Saying so beats an empty
           rail that looks like a failed fetch. */
        <div className="px-[8%]" role="status">
          <p className="text-lg" style={{ color: LP.inkSoft }}>
            No AI recommendations match this rating.
            <br />
            Try another filter.
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="mt-5 px-[26px] py-[13px] rounded-full font-bold text-[15px] cursor-pointer border-none transition-transform duration-300 hover:-translate-y-0.5"
            style={{ background: LP.green, color: LP.goldSoft }}
          >
            Show all retreats
          </button>
        </div>
      ) : (
      <div
        ref={scrollRef}
        className="flex gap-[26px] overflow-x-auto snap-x snap-mandatory px-[8%] pt-3 pb-[30px] scroll-hide"
      >
        {visible.map((stay, i) => (
          <Reveal key={stay.id} index={i % 4} className="flex-[0_0_320px] md:flex-[0_0_380px] snap-start">
            <Link
              href={`/property/${stay.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-[26px] overflow-hidden bg-white transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-2.5"
              style={{ boxShadow: "0 14px 40px rgba(20,52,42,.1)" }}
              aria-label={`${stay.name}, ${stay.location} — ${formatPrice(stay.price)} per night, ${ratingLabel(stay.rating)} (opens in a new tab)`}
            >
              <div className="relative h-[270px] overflow-hidden">
                <CardImage stay={stay} />
                <div className="absolute top-4 left-4 flex gap-2">
                  {stay.isSuperhost && (
                    <span className="px-[13px] py-[7px] rounded-full font-bold text-xs" style={{ background: "rgba(255,255,255,.9)", color: LP.ink }}>
                      Superhost
                    </span>
                  )}
                  {stay.rating !== null && (
                    <span
                      className="px-[13px] py-[7px] rounded-full font-bold text-xs inline-flex items-center gap-[5px]"
                      style={{ background: "rgba(30,76,58,.9)", color: LP.goldSoft }}
                    >
                      <Sparkles aria-hidden className="size-3" style={{ fill: LP.goldSoft }} />
                      {matchPct(stay.rating)}% Match
                    </span>
                  )}
                </div>
                <WishlistButton
                  propertyId={stay.id}
                  className="top-4 right-4 w-[42px] h-[42px] p-0 flex items-center justify-center bg-white/[.88] backdrop-blur-none text-primary hover:bg-white transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="px-6 pt-[22px] pb-[26px]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-2xl font-semibold line-clamp-1" style={{ fontFamily: "var(--font-cormorant)", color: LP.ink }}>
                    {stay.name}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {/* The star is omitted for an unrated stay: a star beside
                        the word "New" reads as a score, which is the thing
                        there isn't one of. */}
                    {stay.rating !== null && (
                      <Star aria-hidden className="size-[15px]" style={{ color: LP.gold, fill: LP.gold }} />
                    )}
                    <span className="font-bold text-[15px]" style={{ color: LP.ink }}>
                      {formatRating(stay.rating)}
                    </span>
                  </div>
                </div>
                <div className="text-[15px] mb-[18px] line-clamp-1" style={{ color: LP.inkSoft }}>{stay.location}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold" style={{ color: LP.ink }}>{formatPrice(stay.price)}</span>
                  <span className="text-[15px]" style={{ color: LP.inkSoft }}>/ night</span>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      )}
    </section>
  );
}
