"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { CityDestination } from "@/lib/queries";

/**
 * "Where to next?" — horizontally scrolling destination tiles on the
 * tinted band. One tile is a solid brand block with text (per design).
 * Presentational: receives live city data from DestinationsSection.
 */
export function FeaturedDestinations({
  destinations,
}: {
  destinations: CityDestination[];
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="destinations-heading" className="bg-surface-container-low py-16">
      <div className="max-w-[1280px] mx-auto px-4 md:px-16">
        <h3
          id="destinations-heading"
          className="font-display text-2xl md:text-[32px] md:leading-10 font-bold text-on-surface mb-10"
        >
          Where to next?
        </h3>
        <ul className="flex gap-6 overflow-x-auto scroll-hide pb-6 -mx-4 px-4" role="list">
          {destinations.map((dest) => (
            <li key={dest.id} className="flex-shrink-0 w-64">
              <motion.a
                href="#"
                className="group block cursor-pointer rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4"
                whileHover={reduceMotion ? undefined : { y: -8 }}
                transition={{ duration: 0.4, ease: [0.21, 0.65, 0.36, 1] }}
              >
                <div className="h-80 rounded-3xl overflow-hidden mb-4 shadow-tinted">
                  {dest.image ? (
                    <Image
                      src={dest.image}
                      alt={dest.imageAlt ?? dest.title}
                      width={256}
                      height={320}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary-container flex items-center justify-center p-8 text-center text-on-primary-container font-display text-[32px] leading-10 font-bold">
                      {dest.tileLabel}
                    </div>
                  )}
                </div>
                <h5 className="font-display text-xl md:text-2xl font-semibold text-center text-on-surface">
                  {dest.title}
                </h5>
              </motion.a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
