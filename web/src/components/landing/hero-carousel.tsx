"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { HERO_SLIDES, LP } from "@/components/landing/landing-data";

const DURATION_MS = 5000;
const N = HERO_SLIDES.length;

/**
 * Premium hero — full-bleed destination carousel: ken-burns imagery, mouse
 * parallax, autoplay with per-dot progress, glass featured-retreat card.
 */
export function HeroCarousel() {
  const [slide, setSlide] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  const go = useCallback((i: number) => {
    startRef.current = performance.now();
    setSlide(((i % N) + N) % N);
  }, []);

  /* autoplay + progress bars (rAF so the bar is smooth) */
  useEffect(() => {
    startRef.current = performance.now();
    const loop = (now: number) => {
      const el = heroRef.current;
      if (el) {
        const pct = Math.min((now - startRef.current) / DURATION_MS, 1);
        el.querySelectorAll<HTMLElement>("[data-progress]").forEach((bar) => {
          bar.style.width =
            Number(bar.dataset.progress) === slide ? `${pct * 100}%` : "0%";
        });
        if (pct >= 1) {
          startRef.current = now;
          setSlide((s) => (s + 1) % N);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [slide]);

  /* mouse parallax */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const move = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      hero.querySelectorAll<HTMLElement>("[data-parallax]").forEach((p) => {
        p.style.transform = `translate(${dx * -26}px, ${dy * -26}px)`;
      });
    };
    const leave = () =>
      hero.querySelectorAll<HTMLElement>("[data-parallax]").forEach((p) => {
        p.style.transform = "translate(0,0)";
      });
    hero.addEventListener("mousemove", move);
    hero.addEventListener("mouseleave", leave);
    return () => {
      hero.removeEventListener("mousemove", move);
      hero.removeEventListener("mouseleave", leave);
    };
  }, []);

  const active = HERO_SLIDES[slide];

  return (
    <section
      ref={heroRef}
      className="lp-anim relative h-[720px] md:h-[900px] w-full overflow-hidden"
      style={{ background: LP.deep }}
      aria-label="Featured destinations"
    >
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.seed}
          aria-hidden={i !== slide}
          className="absolute inset-0 transition-opacity duration-[1300ms] ease-[cubic-bezier(.16,1,.3,1)]"
          style={{ opacity: i === slide ? 1 : 0, zIndex: i === slide ? 2 : 1 }}
        >
          <div data-parallax className="absolute -inset-10 will-change-transform">
            <Image
              src={s.img}
              alt={s.name}
              fill
              priority={i === 0}
              unoptimized
              sizes="100vw"
              className="object-cover"
              style={{ animation: "lp-kenburns 14s ease-out infinite alternate" }}
            />
          </div>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(13,32,26,.30) 0%, rgba(13,32,26,.12) 40%, rgba(13,32,26,.72) 100%)",
            }}
          />
          {/* top scrim: keeps the transparent header + search bar legible */}
          <div
            className="absolute inset-x-0 top-0 h-[220px]"
            style={{
              background:
                "linear-gradient(180deg, rgba(13,32,26,.55) 0%, rgba(13,32,26,.25) 55%, rgba(13,32,26,0) 100%)",
            }}
          />
        </div>
      ))}

      {/* foreground copy */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end px-[8%] max-w-[1500px] mx-auto pointer-events-none">
        <div className="max-w-[760px] pb-24 pointer-events-auto">
          <div
            className="inline-flex items-center gap-2 px-[18px] py-[9px] rounded-full mb-6 border"
            style={{
              background: "rgba(255,255,255,.13)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderColor: "rgba(255,255,255,.22)",
            }}
          >
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: LP.goldSoft }} />
            <span className="text-[13px] font-semibold uppercase tracking-[2px]" style={{ color: "#f3efe6" }}>
              {active.name}
            </span>
          </div>
          <h1
            className="text-white text-5xl md:text-[76px] md:leading-[1.02] font-semibold mb-[22px] [text-wrap:balance]"
            style={{
              fontFamily: "var(--font-cormorant)",
              letterSpacing: "-1px",
              textShadow: "0 2px 40px rgba(0,0,0,.35)",
            }}
          >
            {active.heading}
          </h1>
          <p className="text-lg md:text-[21px] leading-normal mb-[38px] max-w-[540px]" style={{ color: "rgba(255,255,255,.86)" }}>
            {active.sub}
          </p>
          <div className="flex gap-4 items-center flex-wrap">
            <Link
              href="/search"
              className="px-[38px] py-[18px] rounded-full font-bold text-[17px] transition-transform duration-300 hover:-translate-y-[3px]"
              style={{ background: LP.gold, color: "#1a1408", boxShadow: "0 12px 34px rgba(201,162,75,.38)" }}
            >
              Explore Stays
            </Link>
            <Link
              href={`/search?where=${encodeURIComponent(active.name)}`}
              className="px-9 py-[18px] rounded-full font-semibold text-[17px] text-white border transition-colors duration-300 hover:bg-white/25"
              style={{
                background: "rgba(255,255,255,.12)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                borderColor: "rgba(255,255,255,.4)",
              }}
            >
              View Collection
            </Link>
          </div>
        </div>
      </div>

      {/* glass featured card */}
      <div
        className="hidden lg:block absolute right-[8%] bottom-28 z-20 w-[290px] p-[26px] rounded-3xl border"
        style={{
          background: "rgba(255,255,255,.14)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "rgba(255,255,255,.28)",
          boxShadow: "0 24px 60px rgba(0,0,0,.28)",
        }}
      >
        <div className="text-[13px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color: "rgba(255,255,255,.7)" }}>
          Featured Retreat
        </div>
        <div className="text-white text-3xl font-semibold leading-tight mb-4" style={{ fontFamily: "var(--font-cormorant)" }}>
          {active.name}
        </div>
        <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "rgba(255,255,255,.2)" }}>
          <div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,.65)" }}>From</div>
            <div className="text-[22px] text-white font-bold">
              {active.price}
              <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,.7)" }}> / night</span>
            </div>
          </div>
          <div className="flex items-center gap-[5px] px-3 py-[7px] rounded-full" style={{ background: "rgba(255,255,255,.16)" }}>
            <Star aria-hidden className="size-[15px]" style={{ color: LP.goldSoft, fill: LP.goldSoft }} />
            <span className="text-white font-bold text-sm">{active.rating}</span>
          </div>
        </div>
      </div>

      {/* prev / next */}
      {[
        { dir: -1, label: "Previous destination", cls: "left-4 md:left-[34px]", Icon: ChevronLeft },
        { dir: 1, label: "Next destination", cls: "right-4 md:right-[34px]", Icon: ChevronRight },
      ].map(({ dir, label, cls, Icon }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          onClick={() => go(slide + dir)}
          className={`absolute ${cls} top-1/2 -translate-y-1/2 z-[25] w-[60px] h-[60px] rounded-full border flex items-center justify-center transition-colors duration-300 hover:bg-white/25`}
          style={{
            borderColor: "rgba(255,255,255,.3)",
            background: "rgba(255,255,255,.1)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <Icon aria-hidden className="size-[22px] text-white" strokeWidth={2.4} />
        </button>
      ))}

      {/* dots + counter */}
      <div className="absolute left-[8%] bottom-[52px] z-[25] flex items-center gap-3.5">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.seed}
            type="button"
            aria-label={`Go to ${s.name}`}
            aria-current={i === slide}
            onClick={() => go(i)}
            className="h-1.5 rounded-full overflow-hidden transition-all duration-500 border-none cursor-pointer p-0"
            style={{ width: i === slide ? 48 : 24, background: "rgba(255,255,255,.28)" }}
          >
            <span data-progress={i} className="block h-full w-0 rounded-full" style={{ background: LP.goldSoft }} />
          </button>
        ))}
      </div>
      <div className="absolute right-[8%] bottom-[52px] z-[25] font-semibold text-[15px] tracking-wider" style={{ color: "rgba(255,255,255,.8)" }}>
        {String(slide + 1).padStart(2, "0")} <span style={{ color: "rgba(255,255,255,.45)" }}>/ {String(N).padStart(2, "0")}</span>
      </div>
    </section>
  );
}
