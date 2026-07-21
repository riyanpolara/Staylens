"use client";

import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/shared/reveal";
import { AI_RECS, AI_TEXT, LP } from "@/components/landing/landing-data";

const PARTICLES = Array.from({ length: 14 }).map((_, i) => ({
  x: `${7 + ((i * 37) % 90)}%`,
  y: `${10 + ((i * 53) % 80)}%`,
  s: 4 + (i % 4) * 3,
  o: 0.25 + (i % 3) * 0.15,
  d: `${5 + (i % 5)}s`,
  delay: `${i * 0.4}s`,
}));

/**
 * "Describe Your Dream Stay" — typewriter demo of the real hybrid AI search.
 * "Generate Stays" runs the typed query against /search for real.
 */
export function AiSearchSection() {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const sectionRef = useRef<HTMLElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || startedRef.current) return;
        startedRef.current = true;
        obs.disconnect();
        let i = 0;
        const type = () => {
          if (i > AI_TEXT.length) return;
          setTyped(AI_TEXT.slice(0, i));
          i += 1;
          timer = window.setTimeout(type, 32 + Math.random() * 34);
        };
        let timer = window.setTimeout(type, 200);
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function generate() {
    const q = (typed || AI_TEXT).trim();
    router.push(`/search?where=${encodeURIComponent(q)}`);
  }

  return (
    <section
      ref={sectionRef}
      className="lp-anim relative px-[8%] py-[90px] md:py-[130px] overflow-hidden"
      style={{ background: "radial-gradient(circle at 30% 20%, #1b4636 0%, #122e24 55%, #0d201a 100%)" }}
      aria-labelledby="ai-heading"
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute rounded-full blur-[1px]"
          style={{
            left: p.x,
            top: p.y,
            width: p.s,
            height: p.s,
            background: `rgba(230,199,120,${p.o})`,
            animation: `lp-floaty ${p.d} ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}

      <div className="relative z-[2] max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-[70px] items-center">
        <Reveal>
          <div>
            <div className="font-bold tracking-[3px] text-[13px] uppercase mb-[18px]" style={{ color: LP.goldSoft }}>
              StayLens Intelligence
            </div>
            <h2
              id="ai-heading"
              className="text-4xl md:text-[62px] md:leading-[1.03] font-semibold text-white mb-6"
              style={{ fontFamily: "var(--font-cormorant)", letterSpacing: "-1px" }}
            >
              Describe Your Dream Stay
            </h2>
            <p className="text-[19px] leading-relaxed mb-9 max-w-[480px]" style={{ color: "rgba(255,255,255,.72)" }}>
              Skip the filters. Tell us how you want to feel, and our AI curates the
              world&apos;s most extraordinary homes to match.
            </p>
            <div
              className="rounded-[22px] p-6 border"
              style={{
                background: "rgba(255,255,255,.08)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderColor: "rgba(255,255,255,.18)",
                boxShadow: "0 24px 60px rgba(0,0,0,.3)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-3.5">
                <Sparkles aria-hidden className="size-[18px]" style={{ color: LP.goldSoft, fill: LP.goldSoft }} />
                <span className="text-[13px] font-semibold tracking-wider uppercase" style={{ color: "rgba(255,255,255,.6)" }}>
                  Ask StayLens AI
                </span>
              </div>
              <div className="text-[22px] text-white leading-snug font-medium min-h-[66px]">
                {typed}
                <span
                  aria-hidden
                  className="inline-block w-0.5 h-6 ml-0.5 align-[-4px]"
                  style={{ background: LP.goldSoft, animation: "lp-blink 1s step-end infinite" }}
                />
              </div>
              <button
                type="button"
                onClick={generate}
                className="mt-[18px] px-[30px] py-[15px] rounded-full font-bold text-base inline-flex items-center gap-2 cursor-pointer border-none transition-transform duration-300 hover:-translate-y-0.5"
                style={{ background: LP.gold, color: "#1a1408" }}
              >
                Generate Stays
                <ArrowRight aria-hidden className="size-[17px]" strokeWidth={2.6} />
              </button>
            </div>
          </div>
        </Reveal>

        {/* golden orb + floating rec cards */}
        <div className="relative hidden lg:flex items-center justify-center min-h-[440px]">
          <div
            aria-hidden
            className="absolute w-[220px] h-[220px] rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 30%, #f4e2a8, #c9a24b 60%, #8f6f2a)",
              animation: "lp-orbpulse 5s ease-in-out infinite",
            }}
          />
          <div
            aria-hidden
            className="absolute w-[320px] h-[320px] rounded-full border border-dashed"
            style={{ borderColor: "rgba(230,199,120,.35)", animation: "lp-spinslow 26s linear infinite" }}
          />
          <div aria-hidden className="absolute w-[410px] h-[410px] rounded-full border" style={{ borderColor: "rgba(230,199,120,.15)" }} />
          {AI_RECS.map((rec) => (
            <div
              key={rec.name}
              className="absolute w-[230px] p-4 rounded-[20px] border"
              style={{
                left: rec.x,
                top: rec.y,
                background: "rgba(255,255,255,.14)",
                backdropFilter: "blur(22px)",
                WebkitBackdropFilter: "blur(22px)",
                borderColor: "rgba(255,255,255,.26)",
                boxShadow: "0 20px 50px rgba(0,0,0,.3)",
                animation: `lp-floaty ${rec.d} ease-in-out infinite`,
                animationDelay: rec.delay,
              }}
            >
              <div className="flex items-center gap-3">
                <Image src={rec.img} alt="" width={52} height={52} unoptimized className="w-[52px] h-[52px] rounded-[14px] object-cover" />
                <div>
                  <div className="text-white font-bold text-[15px]">{rec.name}</div>
                  <div className="text-[13px]" style={{ color: "rgba(255,255,255,.7)" }}>{rec.loc}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold text-sm" style={{ color: LP.goldSoft }}>{rec.match} match</span>
                <span className="text-white font-bold text-sm">{rec.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
