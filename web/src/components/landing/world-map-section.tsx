"use client";

import { useState } from "react";
import { Reveal } from "@/components/shared/reveal";
import { LP, MAP_ARCS, MAP_MARKERS } from "@/components/landing/landing-data";

/** "150 countries, one lens" — dotted world panel, flowing arcs, pulsing markers. */
export function WorldMapSection() {
  const [hovered, setHovered] = useState(-1);

  return (
    <section
      className="lp-anim relative px-[8%] py-[90px] md:py-[130px] overflow-hidden"
      style={{ background: "linear-gradient(180deg, #122e24 0%, #0d201a 100%)" }}
      aria-labelledby="map-heading"
    >
      <Reveal>
        <div className="text-center max-w-[640px] mx-auto mb-16">
          <div className="font-bold tracking-[3px] text-[13px] uppercase mb-4" style={{ color: LP.goldSoft }}>
            Where in the World
          </div>
          <h2
            id="map-heading"
            className="text-4xl md:text-[56px] md:leading-[1.05] font-semibold text-white mb-4"
            style={{ fontFamily: "var(--font-cormorant)", letterSpacing: "-1px" }}
          >
            150 countries, one lens
          </h2>
          <p className="text-lg m-0" style={{ color: "rgba(255,255,255,.7)" }}>
            Explore our most-loved destinations, connected by travelers who found
            their perfect stay.
          </p>
        </div>
      </Reveal>

      <div
        className="relative max-w-[1100px] mx-auto aspect-[2/1] rounded-[28px]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,.10) 1.4px, transparent 1.4px)",
          backgroundSize: "20px 20px",
        }}
      >
        <svg viewBox="0 0 1000 500" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
          {MAP_ARCS.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="rgba(230,199,120,.5)"
              strokeWidth="1.6"
              strokeDasharray="6 8"
              style={{ animation: "lp-dashflow 2.5s linear infinite" }}
            />
          ))}
        </svg>

        {MAP_MARKERS.map((m, i) => (
          <div
            key={m.name}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-[5] cursor-pointer"
            style={{ left: m.x, top: m.y }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(-1)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(-1)}
            tabIndex={0}
            role="button"
            aria-label={`${m.name}: ${m.stays} stays, rated ${m.rating}`}
          >
            <span
              className="block w-4 h-4 rounded-full"
              style={{
                background: LP.goldSoft,
                border: "3px solid rgba(255,255,255,.85)",
                animation: "lp-markerpulse 2.6s ease-out infinite",
                animationDelay: m.delay,
              }}
            />
            <div
              className="absolute left-1/2 bottom-[26px] w-[180px] px-4 py-3.5 rounded-2xl border pointer-events-none transition-all duration-[350ms]"
              style={{
                transform: `translateX(-50%) translateY(${hovered === i ? "0" : "8px"})`,
                opacity: hovered === i ? 1 : 0,
                background: "rgba(255,255,255,.16)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderColor: "rgba(255,255,255,.3)",
                boxShadow: "0 16px 40px rgba(0,0,0,.35)",
              }}
            >
              <div className="text-xl font-semibold text-white" style={{ fontFamily: "var(--font-cormorant)" }}>{m.name}</div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[13px]" style={{ color: "rgba(255,255,255,.72)" }}>{m.stays} stays</span>
                <span className="font-bold text-[13px]" style={{ color: LP.goldSoft }}>{m.rating}★</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
