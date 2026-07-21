import { Gem, Lock, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { LP } from "@/components/landing/landing-data";

const FEATURES: { title: string; body: string; Icon: LucideIcon }[] = [
  {
    title: "AI Recommendations",
    body: "Describe a feeling; receive a shortlist of homes matched to it with startling precision.",
    Icon: Sparkles,
  },
  {
    title: "Verified Properties",
    body: "Every home is inspected and confirmed, so what you see is exactly what welcomes you.",
    Icon: ShieldCheck,
  },
  {
    title: "Secure Booking",
    body: "Encrypted payments and flexible cancellation on every stay, backed by 24/7 support.",
    Icon: Lock,
  },
  {
    title: "Luxury Experiences",
    body: "Private chefs, guides and transfers — curated add-ons that turn a stay into a story.",
    Icon: Gem,
  },
];

/** "A new lens on luxury travel" — 4 glass feature cards. */
export function FeaturesSection() {
  return (
    <section className="px-[8%] py-[90px] md:py-[130px]" style={{ background: LP.cream }} aria-labelledby="why-heading">
      <div className="max-w-[1400px] mx-auto">
        <Reveal>
          <div className="text-center max-w-[640px] mx-auto mb-16">
            <div className="font-bold tracking-[3px] text-[13px] uppercase mb-4" style={{ color: LP.gold }}>
              Why StayLens
            </div>
            <h2
              id="why-heading"
              className="text-4xl md:text-[56px] md:leading-[1.05] font-semibold m-0"
              style={{ fontFamily: "var(--font-cormorant)", color: LP.ink, letterSpacing: "-1px" }}
            >
              A new lens on luxury travel
            </h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[26px]">
          {FEATURES.map(({ title, body, Icon }, i) => (
            <Reveal key={title} index={i}>
              <div
                className="p-[30px] pt-[38px] rounded-[26px] border transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-2.5"
                style={{
                  background: "rgba(255,255,255,.7)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  borderColor: "rgba(20,52,42,.07)",
                  boxShadow: "0 14px 36px rgba(20,52,42,.07)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-[26px]"
                  style={{ background: "linear-gradient(135deg, #205c46, #2d6a4f)" }}
                >
                  <Icon aria-hidden className="size-[30px]" style={{ color: LP.goldSoft }} strokeWidth={2} />
                </div>
                <h3 className="text-[26px] font-semibold mb-3 m-0" style={{ fontFamily: "var(--font-cormorant)", color: LP.ink }}>
                  {title}
                </h3>
                <p className="text-[15px] leading-relaxed m-0" style={{ color: LP.inkSoft }}>{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
