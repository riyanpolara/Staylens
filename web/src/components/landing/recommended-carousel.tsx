"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import { ChevronLeft, ChevronRight, Heart, Sparkles, Star } from "lucide-react";
import { useRef } from "react";
import { Reveal } from "@/components/shared/reveal";
import { LP } from "@/components/landing/landing-data";
import type { ExploreStay } from "@/lib/queries";

/** design-style "AI match" derived from the real rating (display only) */
function matchPct(rating: number): number {
  return Math.min(99, Math.round(86 + rating * 2.4));
}

/**
 * "AI-recommended retreats" — horizontal scroll-snap carousel of LIVE top
 * stays. Cards open the property in a new tab (app convention).
 */
export function RecommendedCarousel({ stays }: { stays: ExploreStay[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) =>
    scrollRef.current?.scrollBy({ left: dir * 406, behavior: "smooth" });

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

      <div
        ref={scrollRef}
        className="flex gap-[26px] overflow-x-auto snap-x snap-mandatory px-[8%] pt-3 pb-[30px] scroll-hide"
      >
        {stays.map((stay, i) => (
          <Reveal key={stay.id} index={i % 4} className="flex-[0_0_320px] md:flex-[0_0_380px] snap-start">
            <Link
              href={`/property/${stay.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-[26px] overflow-hidden bg-white transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-2.5"
              style={{ boxShadow: "0 14px 40px rgba(20,52,42,.1)" }}
              aria-label={`${stay.name}, ${stay.location} — ${formatPrice(stay.price)} per night (opens in a new tab)`}
            >
              <div className="relative h-[270px] overflow-hidden">
                {stay.images[0] ? (
                  <Image
                    src={stay.images[0].url}
                    alt={stay.name}
                    fill
                    unoptimized={stay.images[0].url.includes("muscache")}
                    sizes="380px"
                    className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0" style={{ background: LP.creamAlt }} />
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  {stay.isSuperhost && (
                    <span className="px-[13px] py-[7px] rounded-full font-bold text-xs" style={{ background: "rgba(255,255,255,.9)", color: LP.ink }}>
                      Superhost
                    </span>
                  )}
                  <span
                    className="px-[13px] py-[7px] rounded-full font-bold text-xs inline-flex items-center gap-[5px]"
                    style={{ background: "rgba(30,76,58,.9)", color: LP.goldSoft }}
                  >
                    <Sparkles aria-hidden className="size-3" style={{ fill: LP.goldSoft }} />
                    {matchPct(stay.rating)}% Match
                  </span>
                </div>
                <span
                  aria-hidden
                  className="absolute top-4 right-4 w-[42px] h-[42px] rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ background: "rgba(255,255,255,.88)" }}
                >
                  <Heart className="size-[19px]" style={{ color: LP.green }} strokeWidth={2.2} />
                </span>
              </div>
              <div className="px-6 pt-[22px] pb-[26px]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-2xl font-semibold line-clamp-1" style={{ fontFamily: "var(--font-cormorant)", color: LP.ink }}>
                    {stay.name}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Star aria-hidden className="size-[15px]" style={{ color: LP.gold, fill: LP.gold }} />
                    <span className="font-bold text-[15px]" style={{ color: LP.ink }}>{stay.rating.toFixed(2)}</span>
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
    </section>
  );
}
