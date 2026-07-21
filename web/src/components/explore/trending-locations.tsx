import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { EXPERIENCES } from "@/lib/placeholder-data";

/**
 * "Trending Experiences" — three tall image cards with a bottom gradient,
 * category kicker, and an arrow chip that slides in on hover.
 */
export function TrendingLocations() {
  return (
    <section
      aria-labelledby="trending-heading"
      className="py-16 max-w-[1280px] mx-auto px-4 md:px-16"
    >
      <h3
        id="trending-heading"
        className="font-display text-2xl md:text-[32px] md:leading-10 font-bold text-on-surface mb-10 text-center md:text-left"
      >
        Trending Experiences
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {EXPERIENCES.map((exp, i) => (
          <Reveal key={exp.id} index={i}>
            <a
              href="#"
              aria-label={`${exp.title} — ${exp.description}`}
              className="relative block h-[450px] rounded-[32px] overflow-hidden group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <Image
                src={exp.image}
                alt={exp.imageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                <span className="text-white/80 text-xs font-medium uppercase tracking-widest mb-2">
                  {exp.category}
                </span>
                <h4 className="text-white font-display text-2xl md:text-[32px] md:leading-10 font-bold mb-4">
                  {exp.title}
                </h4>
                <p className="text-white/70 line-clamp-2 mb-6">{exp.description}</p>
                <span
                  aria-hidden
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center self-end opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 -translate-y-4 group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-all duration-300"
                >
                  <ArrowRight className="size-5 text-primary" />
                </span>
              </div>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
