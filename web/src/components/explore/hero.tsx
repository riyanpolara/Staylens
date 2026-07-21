"use client";

import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { HERO } from "@/lib/placeholder-data";

/**
 * Hero: gradient backdrop, collection badge, display headline, copy, and
 * the rotated two-image collage with the design's mouse-parallax
 * micro-interaction. (Search lives below the navbar, like the video.)
 */
export function Hero() {
  const reduceMotion = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x1 = useSpring(useTransform(mx, (v) => v * 10), { stiffness: 60, damping: 20 });
  const y1 = useSpring(useTransform(my, (v) => v * 10), { stiffness: 60, damping: 20 });
  const x2 = useSpring(useTransform(mx, (v) => v * 20), { stiffness: 60, damping: 20 });
  const y2 = useSpring(useTransform(my, (v) => v * 20), { stiffness: 60, damping: 20 });

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <section
      aria-labelledby="hero-heading"
      onMouseMove={onMouseMove}
      className="hero-gradient relative pt-16 pb-32 overflow-hidden"
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-16 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <motion.div
          className="lg:col-span-6 z-10"
          initial={reduceMotion ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.21, 0.65, 0.36, 1] }}
        >
          <span className="inline-block px-4 py-1.5 bg-primary-fixed text-on-primary-fixed-variant rounded-full text-xs font-medium tracking-wider mb-6">
            {HERO.badge}
          </span>
          <h2
            id="hero-heading"
            className="font-display text-[32px] leading-10 md:text-5xl md:leading-[56px] md:tracking-[-0.02em] font-bold text-on-surface mb-6"
          >
            {HERO.titleLead}
            <span className="text-primary">{HERO.titleAccent}</span>
          </h2>
          <p className="text-lg leading-7 text-on-surface-variant max-w-xl">
            {HERO.subtitle}
          </p>
        </motion.div>

        <div className="lg:col-span-6 relative h-[500px] hidden md:block" aria-hidden>
          <motion.div
            style={reduceMotion ? undefined : { x: x1, y: y1 }}
            className="absolute top-0 right-0 w-3/4 h-3/4 rounded-3xl overflow-hidden shadow-tinted rotate-3 z-0"
          >
            <Image
              src={HERO.images[0].src}
              alt={HERO.images[0].alt}
              fill
              sizes="(max-width: 1024px) 50vw, 480px"
              className="object-cover"
              priority
            />
          </motion.div>
          <motion.div
            style={reduceMotion ? undefined : { x: x2, y: y2 }}
            className="absolute bottom-0 left-0 w-3/4 h-3/4 rounded-3xl overflow-hidden shadow-tinted -rotate-3 z-10 border-4 border-surface"
          >
            <Image
              src={HERO.images[1].src}
              alt={HERO.images[1].alt}
              fill
              sizes="(max-width: 1024px) 50vw, 480px"
              className="object-cover"
              priority
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
