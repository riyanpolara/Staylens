"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MODAL_KEYS } from "@/components/search-results/filter-config";

/**
 * Shared search-filter logic (URL is the source of truth). Used by both the
 * desktop FiltersBar and the mobile MobileFilters so the toggle behaviour and
 * active-count are identical across layouts — no duplicated business logic.
 */
export function useAmenityFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeAmenities = new Set(
    (searchParams.get("am") ?? "").split(",").filter(Boolean),
  );
  const bathActive = searchParams.get("bath") === "1";
  const modalCount =
    MODAL_KEYS.filter((k) => searchParams.has(k)).length + activeAmenities.size;

  function replaceParams(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function toggleAmenity(slug: string) {
    replaceParams((next) => {
      const set = new Set((next.get("am") ?? "").split(",").filter(Boolean));
      if (set.has(slug)) set.delete(slug);
      else set.add(slug);
      if (set.size) next.set("am", [...set].join(","));
      else next.delete("am");
    });
  }

  function toggleBath() {
    replaceParams((next) => {
      if (next.get("bath") === "1") next.delete("bath");
      else next.set("bath", "1");
    });
  }

  return { activeAmenities, bathActive, modalCount, toggleAmenity, toggleBath };
}
