"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, TreePine } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Branded fallback for photos that no longer exist upstream. */
function ImageFallback() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-surface-container to-surface-container-high flex flex-col items-center justify-center gap-2">
      <TreePine aria-hidden className="size-10 text-outline-variant" strokeWidth={1.4} />
      <span className="text-xs text-on-surface-variant">Photo unavailable</span>
    </div>
  );
}

type CarouselImage = { url: string; alt: string };

type ImageCarouselProps = {
  images: CarouselImage[];
  /** next/image sizes hint from the parent card */
  sizes: string;
  className?: string;
};

/**
 * Card image carousel (Airbnb-style): arrows appear on hover, dots show
 * position. Collapses to a plain image when there's a single photo, so the
 * design is unchanged for one-image properties. Arrows/dots stop the parent
 * link navigation.
 */
export function ImageCarousel({ images, sizes, className }: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const reduceMotion = useReducedMotion();
  const many = images.length > 1;

  function go(e: React.MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    setDirection(delta);
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  if (images.length === 0) {
    return <div className={cn("w-full h-full bg-surface-container", className)} />;
  }

  return (
    <div
      role={many ? "group" : undefined}
      aria-roledescription={many ? "carousel" : undefined}
      className={cn("relative w-full h-full overflow-hidden", className)}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={images[index].url}
          className="absolute inset-0"
          custom={direction}
          initial={reduceMotion || !many ? false : { x: direction > 0 ? "100%" : "-100%" }}
          animate={{ x: 0 }}
          exit={reduceMotion || !many ? undefined : { x: direction > 0 ? "-100%" : "100%" }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        >
          {failed.has(images[index].url) ? (
            <ImageFallback />
          ) : (
            <Image
              src={images[index].url}
              alt={images[index].alt}
              fill
              sizes={sizes}
              // Airbnb's CDN throttles bursts from a single server IP, which
              // randomly breaks cards when the optimizer proxies 24 at once —
              // load these directly in the browser, like airbnb.com does.
              unoptimized={images[index].url.includes("muscache.com")}
              onError={() =>
                setFailed((f) => new Set(f).add(images[index].url))
              }
              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {many && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => go(e, -1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-surface/90 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-tinted"
          >
            <ChevronLeft aria-hidden className="size-4 text-on-surface" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => go(e, 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-surface/90 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-tinted"
          >
            <ChevronRight aria-hidden className="size-4 text-on-surface" />
          </button>
          <div
            aria-hidden
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5"
          >
            {images.map((img, i) => (
              <span
                key={img.url}
                className={cn(
                  "h-1.5 rounded-full bg-white/70 transition-all",
                  i === index ? "w-4 bg-white" : "w-1.5",
                )}
              />
            ))}
          </div>
          <span className="sr-only" aria-live="polite">
            Photo {index + 1} of {images.length}
          </span>
        </>
      )}
    </div>
  );
}
