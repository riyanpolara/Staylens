import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageCarousel } from "@/components/explore/image-carousel";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { nightsLabel } from "@/lib/pricing";
import { formatPrice } from "@/lib/currency";
import type { ExploreStay } from "@/lib/queries";

type PropertyCardProps = {
  stay: ExploreStay;
  /**
   * explore — Stitch "Curated Collections" card (rating chip top-right)
   * result  — Stitch "Search Results" card (heart top-right, rating
   *           chip bottom-left, dates line, "$X night")
   */
  variant?: "explore" | "result";
  /** the featured explore card is wider — 16:9 vs 5:4 */
  featured?: boolean;
  /** optional dates line under the location (result variant) */
  datesLabel?: string;
  /** nights in the searched range — shows the stay total instead of nightly */
  nights?: number;
  /** query string (e.g. "?in=…&out=…") carried onto the detail link */
  hrefQuery?: string;
  className?: string;
};

/**
 * Stay card — server component; only the image carousel is a client island.
 * One component serves both Stitch card layouts via `variant`.
 */
export function PropertyCard({
  stay,
  variant = "explore",
  featured = false,
  datesLabel,
  nights,
  hrefQuery,
  className,
}: PropertyCardProps) {
  const isResult = variant === "result";
  const stayTotal = nights && nights > 0 ? stay.price * nights : null;
  const sizes = featured
    ? "(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 640px"
    : "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 320px";

  return (
    <article className={cn("group cursor-pointer", className)}>
      <Link
        href={`/property/${stay.id}${hrefQuery ?? ""}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${stay.name}, ${stay.location} — ${
          stayTotal
            ? `${formatPrice(stayTotal)} ${nightsLabel(nights!)}`
            : `${formatPrice(stay.price)} per night`
        }, rated ${stay.rating.toFixed(2)} from ${stay.reviews} reviews (opens in a new tab)`}
        className="block rounded-[20px] focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <div
          className={cn(
            "relative rounded-[20px] overflow-hidden mb-4 shadow-tinted transition-shadow duration-300 hover:shadow-tinted-lg",
            featured && !isResult ? "aspect-[16/9]" : "aspect-[5/4]",
          )}
        >
          <ImageCarousel images={stay.images} sizes={sizes} />

          {isResult ? (
            <>
              {/* heart — top-right, per the results design */}
              <WishlistButton propertyId={stay.id} />
              {/* rating chip — bottom-left, per the results design */}
              <div className="absolute bottom-3 left-3 z-10 bg-surface-container-lowest/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                <Star aria-hidden className="size-3.5 text-primary fill-primary" />
                <span className="text-xs font-bold">{stay.rating.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              {/* badges — top-left, per the design's "Rare Find" pattern */}
              {(stay.isRareFind || stay.isSuperhost) && (
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  {stay.isRareFind && (
                    <span className="bg-primary-container text-white px-3 py-1 rounded-full text-xs font-bold">
                      Rare Find
                    </span>
                  )}
                  {stay.isSuperhost && (
                    <span className="bg-surface/90 backdrop-blur-md text-on-surface px-3 py-1 rounded-full text-xs font-bold">
                      Superhost
                    </span>
                  )}
                </div>
              )}
              {/* rating chip — top-right, exactly as the explore design */}
              <div className="absolute top-4 right-4 z-10 bg-surface/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1">
                <Star aria-hidden className="size-3.5 text-tertiary fill-tertiary" />
                <span className="text-xs font-bold">{stay.rating.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {isResult ? (
          <div>
            <h3 className="text-sm font-bold text-on-surface line-clamp-1">{stay.name}</h3>
            <p className="text-on-surface-variant text-xs mt-0.5 line-clamp-1">
              {stay.location}
            </p>
            {datesLabel && (
              <p className="text-on-surface-variant text-xs">{datesLabel}</p>
            )}
            {stayTotal ? (
              <p className="mt-2 text-sm text-primary">
                <span className="font-bold">{formatPrice(stayTotal)}</span>{" "}
                <span className="text-on-surface-variant">{nightsLabel(nights!)}</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-primary">
                <span className="font-bold">{formatPrice(stay.price)}</span> night
              </p>
            )}
          </div>
        ) : (
          <div className={cn(featured && "flex justify-between items-start")}>
            <div>
              <h4 className="font-display text-xl md:text-2xl font-semibold text-on-surface line-clamp-1">
                {stay.name}
              </h4>
              <p className="text-on-surface-variant line-clamp-1">{stay.location}</p>
            </div>
            <p className={cn(featured ? "text-right shrink-0 ml-4" : "mt-2")}>
              <span className="font-bold text-primary">
                {formatPrice(stay.price)}
              </span>
              <span className="text-on-surface-variant text-sm"> / night</span>
            </p>
          </div>
        )}
      </Link>
    </article>
  );
}
