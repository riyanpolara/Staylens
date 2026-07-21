"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/shared/reveal";
import { LP, TESTIMONIALS } from "@/components/landing/landing-data";

const N = TESTIMONIALS.length;

/** "Stories from our travelers" — autoplaying crossfade testimonials. */
export function TestimonialsSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((t) => (t + 1) % N), 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="px-[8%] py-[90px] md:py-[130px]" style={{ background: LP.creamAlt }} aria-labelledby="testi-heading">
      <div className="max-w-[1200px] mx-auto">
        <Reveal>
          <div className="text-center mb-[60px]">
            <div className="font-bold tracking-[3px] text-[13px] uppercase mb-4" style={{ color: LP.gold }}>
              Guest Experiences
            </div>
            <h2
              id="testi-heading"
              className="text-4xl md:text-[56px] md:leading-[1.05] font-semibold m-0"
              style={{ fontFamily: "var(--font-cormorant)", color: LP.ink, letterSpacing: "-1px" }}
            >
              Stories from our travelers
            </h2>
          </div>
        </Reveal>

        <div className="relative min-h-[560px] md:min-h-[420px]">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              aria-hidden={i !== active}
              className="absolute inset-0 grid grid-cols-1 md:grid-cols-[340px_1fr] gap-8 md:gap-14 items-center transition-opacity duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)]"
              style={{ opacity: i === active ? 1 : 0, zIndex: i === active ? 2 : 1 }}
            >
              <div className="relative hidden md:block">
                <Image
                  src={t.img}
                  alt={t.name}
                  width={340}
                  height={400}
                  unoptimized
                  className="w-[340px] h-[400px] object-cover rounded-[28px]"
                  style={{ boxShadow: "0 24px 60px rgba(20,52,42,.2)" }}
                />
                <div
                  className="absolute bottom-6 -right-6 px-[22px] py-4 rounded-[20px] bg-white text-center"
                  style={{ boxShadow: "0 16px 40px rgba(20,52,42,.15)" }}
                >
                  <div className="text-[34px] font-bold leading-none" style={{ fontFamily: "var(--font-cormorant)", color: LP.green }}>
                    {t.stayNum}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: LP.inkSoft }}>stays booked</div>
                </div>
              </div>
              <div>
                <div className="flex gap-1 mb-6" aria-label="5 star review">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} aria-hidden className="size-6" style={{ color: LP.gold, fill: LP.gold }} />
                  ))}
                </div>
                <blockquote
                  className="text-2xl md:text-[34px] md:leading-[1.32] font-medium mb-[30px] m-0 [text-wrap:pretty]"
                  style={{ fontFamily: "var(--font-cormorant)", color: LP.ink }}
                >
                  “{t.quote}”
                </blockquote>
                <div className="font-bold text-lg" style={{ color: LP.ink }}>{t.name}</div>
                <div className="text-[15px]" style={{ color: LP.inkSoft }}>{t.role}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2.5 mt-10">
          {TESTIMONIALS.map((t, i) => (
            <button
              key={t.name}
              type="button"
              aria-label={`Show testimonial from ${t.name}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
              className="h-2.5 rounded-full border-none cursor-pointer transition-all duration-[400ms] p-0"
              style={{
                width: i === active ? 34 : 10,
                background: i === active ? LP.green : "rgba(32,92,70,.25)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
