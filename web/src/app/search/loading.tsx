import { PropertyCardSkeleton } from "@/components/explore/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="pt-[144px] md:pt-[166px] max-w-[1280px] mx-auto px-4 md:px-16 pb-16"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex gap-2 py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full shrink-0" />
        ))}
      </div>
      <Skeleton className="h-8 w-72 mt-2 mb-2" />
      <Skeleton className="h-5 w-96 mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
