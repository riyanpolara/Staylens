import { PropertyCardSkeleton } from "@/components/explore/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="pt-[calc(env(safe-area-inset-top)+5rem)] md:pt-[88px] max-w-[1400px] mx-auto px-4 md:px-10 pb-16"
      aria-busy="true"
      aria-live="polite"
    >
      {/* quick-filter row: scrolls horizontally instead of overflowing the
          viewport (fixed-width pills in a plain flex forced the page ~2x wide
          on mobile, blowing up every card) */}
      <div className="flex gap-2 py-4 overflow-x-auto scroll-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full shrink-0" />
        ))}
      </div>
      <Skeleton className="h-6 w-40 md:h-8 md:w-72 mt-2 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
