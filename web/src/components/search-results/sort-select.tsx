"use client";

import { ArrowUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Top rated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "reviews", label: "Most reviewed" },
];

/** Sort control — writes ?sort= to the URL; results are server-sorted. */
export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "recommended";

  function onChange(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "recommended") next.delete("sort");
    else next.set("sort", value);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <label className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-full pl-4 pr-3 py-2 text-sm font-semibold cursor-pointer hover:border-primary transition-colors shrink-0">
      <ArrowUpDown aria-hidden className="size-4 text-primary" />
      <span className="sr-only">Sort results</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent focus:outline-none cursor-pointer appearance-none pr-1"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
