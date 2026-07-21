import { Leaf, ShieldCheck, Wallet } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { BRAND_VALUES } from "@/lib/placeholder-data";

const ICONS = {
  shield: ShieldCheck,
  payments: Wallet,
  leaf: Leaf,
} as const;

/** "The Staylens Difference" — deep-green band with three value cards. */
export function BrandValues() {
  return (
    <section aria-labelledby="values-heading" className="py-16 bg-primary text-primary-foreground">
      <div className="max-w-[1280px] mx-auto px-4 md:px-16">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <h2
            id="values-heading"
            className="font-display text-2xl md:text-[32px] md:leading-10 font-bold mb-6"
          >
            The Staylens Difference
          </h2>
          <p className="text-primary-fixed opacity-90 text-lg leading-7">
            Redefining luxury travel through transparency, curation, and the
            soul of nature.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {BRAND_VALUES.map((value, i) => {
            const Icon = ICONS[value.icon];
            return (
              <Reveal key={value.id} index={i}>
                <div className="h-full text-center p-6 bg-on-primary-fixed-variant/20 rounded-3xl border border-on-primary-fixed-variant/30">
                  <div className="w-16 h-16 bg-primary-fixed/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon aria-hidden className="size-9 text-primary-fixed" strokeWidth={1.6} />
                  </div>
                  <h5 className="font-display text-xl md:text-2xl font-semibold mb-2">
                    {value.title}
                  </h5>
                  <p className="text-primary-fixed/80">{value.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
