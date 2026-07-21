import Image from "next/image";
import { Reveal } from "@/components/shared/reveal";
import { HOST_BANNER } from "@/lib/placeholder-data";

/** "Share your sanctuary." — rounded-40 split CTA card. */
export function HostBanner() {
  return (
    <section
      aria-labelledby="host-heading"
      className="py-16 max-w-[1280px] mx-auto px-4 md:px-16"
    >
      <Reveal>
        <div className="relative bg-surface-container-high rounded-[40px] overflow-hidden flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 p-8 md:p-16">
            <h2
              id="host-heading"
              className="font-display text-2xl md:text-[32px] md:leading-10 font-bold text-on-surface mb-6"
            >
              {HOST_BANNER.title}
            </h2>
            <p className="text-on-surface-variant text-lg leading-7 mb-10">
              {HOST_BANNER.subtitle}
            </p>
            <button
              type="button"
              className="cta-gradient text-white px-10 py-4 rounded-xl font-bold hover:shadow-xl hover:-translate-y-1 transition-all focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {HOST_BANNER.cta}
            </button>
          </div>
          <div className="w-full md:w-1/2 h-full min-h-[280px] md:min-h-[400px] relative self-stretch">
            <Image
              src={HOST_BANNER.image}
              alt={HOST_BANNER.imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
