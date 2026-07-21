import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/shared/reveal";
import { CTA_IMG, LP } from "@/components/landing/landing-data";

/** Final CTA — mountain panorama with layered actions. */
export function PremiumCta() {
  return (
    <section className="lp-anim relative mx-[8%] mb-[100px] rounded-[36px] overflow-hidden min-h-[560px] flex items-center">
      <Image
        src={CTA_IMG}
        alt="Mountain panorama"
        fill
        unoptimized
        sizes="100vw"
        className="object-cover"
        style={{ animation: "lp-kenburns 20s ease-out infinite alternate" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(120deg, rgba(13,32,26,.82) 0%, rgba(13,32,26,.5) 60%, rgba(13,32,26,.35) 100%)" }}
      />
      <Reveal className="relative z-[2] px-[7%] max-w-[820px] py-16">
        <div>
          <div className="font-bold tracking-[3px] text-[13px] uppercase mb-5" style={{ color: LP.goldSoft }}>
            Your Next Escape
          </div>
          <h2
            className="text-4xl md:text-[72px] md:leading-[1.02] font-semibold text-white mb-[26px] [text-wrap:balance]"
            style={{ fontFamily: "var(--font-cormorant)", letterSpacing: "-1px" }}
          >
            The world&apos;s finest stays, found for you
          </h2>
          <p className="text-xl leading-normal mb-10 max-w-[520px]" style={{ color: "rgba(255,255,255,.82)" }}>
            Let StayLens turn a feeling into your next unforgettable retreat.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link
              href="/search"
              className="px-[38px] py-[18px] rounded-full font-bold text-[17px] transition-transform duration-300 hover:-translate-y-[3px]"
              style={{ background: LP.gold, color: "#1a1408", boxShadow: "0 14px 36px rgba(201,162,75,.4)" }}
            >
              Explore Stays
            </Link>
            <Link
              href="/search?where=quiet%20beachfront%20villa%20with%20infinity%20pool"
              className="px-[38px] py-[18px] rounded-full font-semibold text-[17px] text-white border transition-colors duration-300 hover:bg-white/25"
              style={{
                background: "rgba(255,255,255,.14)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                borderColor: "rgba(255,255,255,.4)",
              }}
            >
              Try AI Search
            </Link>
            <a
              href="#"
              className="px-[38px] py-[18px] rounded-full font-semibold text-[17px] text-white border bg-transparent transition-colors duration-300 hover:border-[#e6c778]"
              style={{ borderColor: "rgba(255,255,255,.35)" }}
            >
              Become a Host
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
