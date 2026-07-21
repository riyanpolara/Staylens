import { Skeleton } from "@/components/ui/skeleton";

/** Loading skeleton mirroring the Edit Profile layout. */
export default function Loading() {
  return (
    <main className="max-w-[1280px] mx-auto px-4 md:px-16 py-16" aria-busy="true">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="hidden lg:block lg:col-span-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
        <div className="lg:col-span-9 space-y-16">
          <Skeleton className="h-48 w-full rounded-[20px]" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-[20px]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="md:col-span-2 h-56 rounded-[20px]" />
            <Skeleton className="h-56 rounded-[20px]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-72 rounded-[20px]" />
            <Skeleton className="h-72 rounded-[20px]" />
          </div>
        </div>
      </div>
    </main>
  );
}
