import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { COLLECTIONS, LP } from "@/components/landing/landing-data";

/** "Every stay, a world of its own" — 8 curated collection tiles. */
export function CollectionsGrid() {
  return (
    <section className="px-[8%] pt-[90px] md:pt-[130px] pb-[90px] md:pb-[120px] max-w-[1500px] mx-auto">
      <Reveal>
        <div className="flex items-end justify-between mb-[60px] flex-wrap gap-5">
          <div>
            <div className="font-bold tracking-[3px] text-[13px] uppercase mb-4" style={{ color: LP.gold }}>
              Curated Collections
            </div>
            <h2
              className="text-4xl md:text-[56px] md:leading-[1.05] font-semibold m-0"
              style={{ fontFamily: "var(--font-cormorant)", color: LP.ink, letterSpacing: "-1px" }}
            >
              Every stay, a world of its own
            </h2>
          </div>
          <Link
            href="/search"
            className="font-bold text-base inline-flex items-center gap-2"
            style={{ color: LP.green }}
          >
            Browse all collections
            <ArrowRight aria-hidden className="size-[18px]" strokeWidth={2.4} />
          </Link>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[26px]">
        {COLLECTIONS.map((col, i) => (
          <Reveal key={col.name} index={i % 4}>
            <Link
              href={`/search?where=${encodeURIComponent(col.query)}`}
              className="group relative block h-[340px] rounded-[26px] overflow-hidden transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-2.5"
              style={{ boxShadow: "0 14px 36px rgba(20,52,42,.12)" }}
              aria-label={`${col.name} — ${col.count.toLocaleString()} stays`}
            >
              <Image
                src={col.img}
                alt={col.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 350px"
                className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.12]"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, rgba(13,32,26,0) 35%, rgba(13,32,26,.78) 100%)" }}
              />
              <div className="absolute left-[22px] right-[22px] bottom-[22px] flex items-end justify-between">
                <div>
                  <div className="text-[27px] font-semibold text-white leading-tight" style={{ fontFamily: "var(--font-cormorant)" }}>
                    {col.name}
                  </div>
                  <div className="text-sm font-medium mt-[3px]" style={{ color: "rgba(255,255,255,.78)" }}>
                    {col.count.toLocaleString()} stays
                  </div>
                </div>
                <div
                  className="w-10 h-10 rounded-full border flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,.16)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderColor: "rgba(255,255,255,.3)",
                  }}
                >
                  <ArrowUpRight aria-hidden className="size-4 text-white" strokeWidth={2.4} />
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
