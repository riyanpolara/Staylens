import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="pt-20 max-w-[1280px] mx-auto px-4 md:px-16" aria-busy="true">
      <Skeleton className="w-full aspect-[16/9] md:aspect-[21/9] rounded-[20px] mt-2 md:mt-6" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mt-8">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="lg:col-span-4">
          <Skeleton className="h-96 rounded-[20px]" />
        </div>
      </div>
    </div>
  );
}
