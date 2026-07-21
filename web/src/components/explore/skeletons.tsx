import { Skeleton } from "@/components/ui/skeleton";

/** Card-level skeleton matching PropertyCard proportions. */
export function PropertyCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className={featured ? "lg:col-span-2" : undefined}>
      <Skeleton
        className={`w-full rounded-[20px] mb-4 ${featured ? "aspect-[16/9]" : "aspect-[5/4]"}`}
      />
      <Skeleton className="h-6 w-2/3 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

/** Full-page skeleton for the Explore route (used by app/loading.tsx). */
export function ExploreSkeleton() {
  return (
    <div className="pt-[144px] md:pt-[166px]" aria-busy="true" aria-live="polite">
      {/* header search bar */}
      <div className="fixed top-20 left-0 right-0 hidden md:flex justify-center pb-5">
        <Skeleton className="h-[66px] w-full max-w-[850px] rounded-full" />
      </div>
      {/* hero */}
      <div className="hero-gradient pt-16 pb-32">
        <div className="max-w-[1280px] mx-auto px-4 md:px-16 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6">
            <Skeleton className="h-8 w-56 rounded-full mb-6" />
            <Skeleton className="h-12 w-full max-w-lg mb-3" />
            <Skeleton className="h-12 w-3/4 mb-6" />
            <Skeleton className="h-5 w-full max-w-xl mb-2" />
            <Skeleton className="h-5 w-2/3" />
          </div>
          <div className="lg:col-span-6 relative h-[500px] hidden md:block">
            <Skeleton className="absolute top-0 right-0 w-3/4 h-3/4 rounded-3xl rotate-3" />
            <Skeleton className="absolute bottom-0 left-0 w-3/4 h-3/4 rounded-3xl -rotate-3" />
          </div>
        </div>
      </div>
      {/* collections */}
      <div className="py-16 max-w-[1280px] mx-auto px-4 md:px-16">
        <Skeleton className="h-9 w-72 mb-2" />
        <Skeleton className="h-5 w-96 mb-10" />
        <div className="flex gap-3 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PropertyCardSkeleton featured />
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
        </div>
      </div>
    </div>
  );
}
