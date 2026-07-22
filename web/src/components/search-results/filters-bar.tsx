"use client";

import {
  AirVent,
  Bath,
  Car,
  CookingPot,
  KeyRound,
  PawPrint,
  SlidersHorizontal,
  Tv,
  WashingMachine,
  Waves,
  Wifi,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FiltersModal } from "@/components/search-results/filters-modal";

/** Video's quick amenity pills → our real amenity slugs. */
const QUICK_FILTERS = [
  { slug: "wifi", label: "Wifi", icon: Wifi },
  { slug: "washer", label: "Washing machine", icon: WashingMachine },
  { slug: "tv", label: "TV", icon: Tv },
  { slug: "free-parking-on-premises", label: "Free parking", icon: Car },
  { slug: "air-conditioning", label: "Air conditioning", icon: AirVent },
  { slug: "kitchen", label: "Kitchen", icon: CookingPot },
  { slug: "pets-allowed", label: "Allows pets", icon: PawPrint },
  { slug: "pool", label: "Pool", icon: Waves },
  { slug: "self-check-in", label: "Self check-in", icon: KeyRound },
] as const;

/** Keys owned by the Filters modal — counted on the Filters button. */
const MODAL_KEYS = ["price", "type", "beds", "bath", "ptype", "fav", "luxe"];

/**
 * Sticky quick-filter bar (video pass 2): outlined "Filters" button that
 * opens the full modal, a divider, then one-click amenity toggles and the
 * "1+ bathrooms" pill. All state lives in the URL (server-filtered).
 */
export function FiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);

  const activeAmenities = new Set(
    (searchParams.get("am") ?? "").split(",").filter(Boolean),
  );
  const bathActive = searchParams.get("bath") === "1";
  const modalCount =
    MODAL_KEYS.filter((k) => searchParams.has(k)).length +
    activeAmenities.size;

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

  const pillClass = (active: boolean) =>
    cn(
      "flex shrink-0 items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all active:scale-95",
      active
        ? "bg-primary-fixed/50 text-on-primary-fixed-variant border-primary"
        : "bg-surface-container-lowest border-outline-variant hover:border-primary hover:text-primary",
    );

  return (
    <section
      aria-label="Filters"
      className="sticky top-[80px] -mx-4 px-4 md:mx-0 md:px-0 bg-surface/90 glass-header py-3 md:py-4 z-40 border-b border-outline-variant/20 md:border-0"
    >
      <div className="flex items-center gap-2 overflow-x-auto scroll-hide pb-1">
        {/* outlined Filters button — opens the modal (video behavior) */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-haspopup="dialog"
          className={cn(
            "flex shrink-0 items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all active:scale-95",
            modalCount > 0
              ? "border-primary text-primary bg-primary-fixed/30"
              : "bg-surface-container-lowest border-outline-variant hover:border-primary hover:text-primary",
          )}
        >
          <SlidersHorizontal aria-hidden className="size-4" />
          {modalCount > 0 ? `Filters · ${modalCount}` : "Filters"}
        </button>
        <span aria-hidden className="h-8 w-px bg-outline-variant mx-1 shrink-0" />

        {QUICK_FILTERS.map(({ slug, label, icon: Icon }) => (
          <button
            key={slug}
            type="button"
            aria-pressed={activeAmenities.has(slug)}
            onClick={() => toggleAmenity(slug)}
            className={pillClass(activeAmenities.has(slug))}
          >
            <Icon aria-hidden className="size-4" strokeWidth={1.9} />
            {label}
          </button>
        ))}

        <button
          type="button"
          aria-pressed={bathActive}
          onClick={() =>
            replaceParams((next) => {
              if (bathActive) next.delete("bath");
              else next.set("bath", "1");
            })
          }
          className={pillClass(bathActive)}
        >
          <Bath aria-hidden className="size-4" strokeWidth={1.9} />
          1+ bathrooms
        </button>
      </div>

      {modalOpen && <FiltersModal onClose={() => setModalOpen(false)} />}
    </section>
  );
}
