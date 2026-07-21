"use client";

import { useEffect, useRef } from "react";
import { LP, STATS } from "@/components/landing/landing-data";

/** Animated counters — count up on first scroll into view. */
export function StatsSection() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target as HTMLElement;
          obs.unobserve(el);
          const target = parseFloat(el.dataset.counter ?? "0");
          const suffix = el.dataset.suffix ?? "";
          const prefix = el.dataset.prefix ?? "";
          const decimals = (el.dataset.counter ?? "").includes(".") ? 1 : 0;
          const t0 = performance.now();
          const dur = 1900;
          const tick = (now: number) => {
            const p = Math.min((now - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const v = target * eased;
            el.textContent =
              prefix + (decimals ? v.toFixed(1) : Math.round(v).toLocaleString()) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 },
    );
    root.querySelectorAll("[data-counter]").forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={rootRef} className="px-[8%] py-[80px] md:py-[110px] bg-white" aria-label="StayLens by the numbers">
      <div className="max-w-[1300px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-[30px]">
      {STATS.map((s) => (
        <div key={s.label} className="text-center">
          <div
            data-counter={s.target}
            data-suffix={s.suffix}
            data-prefix={s.prefix}
            className="text-5xl md:text-[76px] font-bold leading-none"
            style={{ fontFamily: "var(--font-cormorant)", color: LP.green, letterSpacing: "-1px" }}
          >
            {s.prefix}0{s.suffix}
          </div>
          <div className="mt-3.5 text-[17px] font-semibold" style={{ color: LP.inkSoft }}>
            {s.label}
          </div>
        </div>
      ))}
      </div>
    </section>
  );
}
