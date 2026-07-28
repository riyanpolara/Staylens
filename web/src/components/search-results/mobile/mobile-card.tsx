import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { ImageCarousel } from "@/components/explore/image-carousel";
import { nightsLabel } from "@/lib/pricing";
import { formatPrice } from "@/lib/currency";
import type { ExploreStay } from "@/lib/queries";

/**
 * Airbnb-style mobile stay card: full-width, 4:3 rounded image with a swipeable
 * carousel and heart overlay, then name + rating on one line, location subtitle,
 * optional dates, and price. Shares the same ExploreStay data + ImageCarousel
 * island as the desktop PropertyCard — only the presentation differs.
 */
export function MobileCard({
  stay,
  datesLabel,
  nights,
  hrefQuery,
}: {
  stay: ExploreStay;
  datesLabel?: string;
  nights: number;
  hrefQuery: string;
}) {
  const stayTotal = nights > 0 ? stay.price * nights : null;

  return (
    <article className="group">
      <Link
        href={`/property/${stay.id}${hrefQuery}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${stay.name}, ${stay.location} — ${
          stayTotal
            ? `${formatPrice(stayTotal)} ${nightsLabel(nights)}`
            : `${formatPrice(stay.price)} per night`
        }, rated ${stay.rating.toFixed(2)} (opens in a new tab)`}
        className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-tinted">
          <ImageCarousel images={stay.images} sizes="100vw" />
          {/* heart overlay — 44px touch target */}
          <span
            aria-hidden
            className="absolute top-3 right-3 z-10 grid place-items-center w-11 h-11 rounded-full text-white/95 hover:text-white transition-colors"
          >
            <Heart className="size-6 drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]" strokeWidth={2} />
          </span>
        </div>

        <div className="pt-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-[15px] text-on-surface line-clamp-1">
              {stay.name}
            </h3>
            <span className="flex items-center gap-1 shrink-0 text-sm text-on-surface">
              <Star aria-hidden className="size-4 text-primary fill-primary" />
              {stay.rating.toFixed(2)}
            </span>
          </div>
          <p className="text-on-surface-variant text-sm mt-0.5 line-clamp-1">
            {stay.location}
          </p>
          {datesLabel && (
            <p className="text-on-surface-variant text-sm">{datesLabel}</p>
          )}
          <p className="mt-1.5 text-[15px] text-on-surface">
            {stayTotal ? (
              <>
                <span className="font-semibold">{formatPrice(stayTotal)}</span>{" "}
                <span className="text-on-surface-variant">{nightsLabel(nights)}</span>
              </>
            ) : (
              <>
                <span className="font-semibold">{formatPrice(stay.price)}</span>{" "}
                <span className="text-on-surface-variant">night</span>
              </>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
