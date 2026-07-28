"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import { useBooking } from "@/components/property/booking-context";
import { checkoutHref } from "@/lib/checkout-url";

const SECTIONS = [
  { id: "photos", label: "Photos" },
  { id: "amenities", label: "Amenities" },
  { id: "reviews", label: "Reviews" },
  { id: "location", label: "Location" },
];

/** fixed SiteHeader height (h-20) — the sub-nav docks right below it */
const HEADER_OFFSET = 80;

/**
 * Airbnb-style sticky section nav. It slides in once the gallery scrolls
 * above the header, and — when the sticky booking card scrolls out of view —
 * reveals a compact price + Reserve summary on the right (image 4 → 5).
 * Must render inside <BookingProvider> so the price stays in sync.
 */
export function PropertySubNav({ propertyId }: { propertyId: string }) {
  const { price, nights, total, checkIn, checkOut, guests } = useBooking();
  const [visible, setVisible] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    const gallery = document.getElementById("photos");
    const card = document.getElementById("booking-card");
    const observers: IntersectionObserver[] = [];

    if (gallery) {
      const o = new IntersectionObserver(
        ([e]) => setVisible(!e.isIntersecting),
        { rootMargin: `-${HEADER_OFFSET + 1}px 0px 0px 0px`, threshold: 0 },
      );
      o.observe(gallery);
      observers.push(o);
    }
    if (card) {
      const o = new IntersectionObserver(
        ([e]) => setShowBooking(!e.isIntersecting),
        { rootMargin: `-${HEADER_OFFSET + 60}px 0px 0px 0px`, threshold: 0 },
      );
      o.observe(card);
      observers.push(o);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  function toBooking() {
    document
      .getElementById("booking-card")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "hidden md:block fixed left-0 right-0 top-20 z-40 glass-header bg-surface/95 border-b border-outline-variant/30 transition-all duration-300",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-4 opacity-0 pointer-events-none",
      )}
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-16 h-14 flex items-center justify-between gap-6">
        <nav aria-label="Property sections" className="flex items-center gap-6">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-sm font-semibold text-on-surface-variant hover:text-primary border-b-2 border-transparent hover:border-primary py-4 transition-colors"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div
          className={cn(
            "flex items-center gap-4 transition-opacity duration-200",
            showBooking ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <p className="text-right leading-tight">
            {nights > 0 ? (
              <>
                <span className="text-sm font-bold text-on-surface">
                  {formatPrice(total)}
                </span>
                <span className="text-xs text-on-surface-variant">
                  {" "}
                  · {nights} night{nights !== 1 ? "s" : ""}
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-on-surface">
                  {formatPrice(price)}
                </span>
                <span className="text-xs text-on-surface-variant"> / night</span>
              </>
            )}
          </p>
          {nights > 0 ? (
            <Link
              href={checkoutHref(propertyId, { checkIn, checkOut, guests })}
              className="px-5 py-2.5 rounded-xl cta-gradient text-white font-semibold text-sm active:scale-95 transition-transform"
            >
              Reserve
            </Link>
          ) : (
            <button
              type="button"
              onClick={toBooking}
              className="px-5 py-2.5 rounded-xl cta-gradient text-white font-semibold text-sm active:scale-95 transition-transform"
            >
              Reserve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
