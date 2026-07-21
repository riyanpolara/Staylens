import Image from "next/image";
import { Star } from "lucide-react";
import type { BookingBreakdown } from "@/lib/pricing";
import { PriceBreakdown } from "@/components/checkout/price-breakdown";
import type { CheckoutProperty } from "@/components/checkout/checkout-types";

/** Right-column booking summary: property snapshot + live price breakdown. */
export function BookingSummaryCard({
  property,
  breakdown,
}: {
  property: CheckoutProperty;
  breakdown: BookingBreakdown;
}) {
  return (
    <aside className="rounded-[20px] border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-tinted lg:sticky lg:top-28">
      <div className="flex gap-4 pb-5 border-b border-outline-variant/30">
        <div className="relative w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-surface-container">
          {property.image && (
            <Image
              src={property.image}
              alt={property.name}
              fill
              sizes="96px"
              unoptimized={property.image.includes("muscache")}
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          {property.propertyType && (
            <p className="text-xs text-on-surface-variant capitalize">{property.propertyType}</p>
          )}
          <h2 className="font-semibold text-on-surface line-clamp-2 leading-snug">
            {property.name}
          </h2>
          {property.rating > 0 && (
            <p className="flex items-center gap-1 text-sm mt-1 text-on-surface-variant">
              <Star aria-hidden className="size-3.5 text-primary fill-primary" />
              <span className="font-semibold text-on-surface">{property.rating.toFixed(2)}</span>
              {property.reviewsCount > 0 && <span>· {property.reviewsCount} reviews</span>}
            </p>
          )}
        </div>
      </div>

      <div className="py-5">
        <h3 className="font-display text-lg font-semibold text-primary mb-4">Price details</h3>
        <PriceBreakdown breakdown={breakdown} />
      </div>

      <p className="pt-4 border-t border-outline-variant/30 text-xs text-on-surface-variant">
        Prices include all fees. This is a preview — you won’t be charged.
      </p>
    </aside>
  );
}
