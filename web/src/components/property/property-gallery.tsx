"use client";

import Image from "next/image";
import { Grip, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ImageCarousel } from "@/components/explore/image-carousel";

type GalleryImage = { url: string; alt: string };

/**
 * Property hero gallery (Stitch design): a wide hero with Rare Find + rating
 * overlay. When multiple photos exist it becomes an Airbnb-style 1+4 grid.
 * Any tile opens a full-screen lightbox that reuses the shared ImageCarousel.
 */
export function PropertyGallery({
  images,
  rating,
  isRareFind,
}: {
  images: GalleryImage[];
  rating: number;
  isRareFind: boolean;
}) {
  const [lightbox, setLightbox] = useState(false);
  const many = images.length > 1;

  useEffect(() => {
    if (!lightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  const Overlay = (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 flex items-center gap-2">
        {isRareFind && (
          <span className="bg-primary-container text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
            Rare Find
          </span>
        )}
        {rating > 0 && (
          <span className="flex items-center gap-1 bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs">
            <Star aria-hidden className="size-3.5 fill-white" />
            {rating.toFixed(2)}
          </span>
        )}
      </div>
    </>
  );

  return (
    <>
      {many ? (
        <div className="relative grid grid-cols-4 grid-rows-2 gap-2 rounded-[20px] overflow-hidden aspect-[16/9] md:aspect-[21/9] shadow-tinted">
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="relative col-span-2 row-span-2 group"
            aria-label="Open photo gallery"
          >
            <Image src={images[0].url} alt={images[0].alt} fill sizes="50vw" unoptimized={images[0].url.includes("muscache")} className="object-cover group-hover:brightness-95 transition" />
          </button>
          {images.slice(1, 5).map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setLightbox(true)}
              className={cn("relative group", images.length < 5 && i === images.slice(1, 5).length - 1 && "col-span-2")}
              aria-label="Open photo gallery"
            >
              <Image src={img.url} alt={img.alt} fill sizes="25vw" unoptimized={img.url.includes("muscache")} className="object-cover group-hover:brightness-95 transition" />
            </button>
          ))}
          {Overlay}
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-surface-container-lowest/95 backdrop-blur px-4 py-2 rounded-lg text-sm font-semibold shadow-tinted hover:scale-105 transition-transform"
          >
            <Grip aria-hidden className="size-4" />
            Show all photos
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="relative block w-full rounded-[20px] overflow-hidden aspect-[16/9] md:aspect-[21/9] shadow-tinted group"
          aria-label="Open photo"
        >
          {images[0] ? (
            <Image
              src={images[0].url}
              alt={images[0].alt}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              unoptimized={images[0].url.includes("muscache")}
              className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-surface-container" />
          )}
          {Overlay}
        </button>
      )}

      {lightbox &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-on-surface/90 flex items-center justify-center p-4 md:p-12">
            <button
              type="button"
              aria-label="Close gallery"
              onClick={() => setLightbox(false)}
              className="absolute top-5 right-5 w-11 h-11 rounded-full bg-surface-container-lowest flex items-center justify-center hover:scale-105 transition-transform"
            >
              <X aria-hidden className="size-5" />
            </button>
            <div className="w-full max-w-5xl aspect-[16/10] rounded-2xl overflow-hidden group">
              <ImageCarousel images={images} sizes="(max-width: 1024px) 100vw, 1024px" />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
