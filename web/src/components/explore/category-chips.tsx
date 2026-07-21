"use client";

import {
  Building2,
  Home,
  Leaf,
  Mountain,
  Palmtree,
  PenTool,
  Waves,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/placeholder-data";

const ICONS: Record<string, typeof Home> = {
  cabin: Warehouse,
  villa: Home,
  beach: Palmtree,
  mountain: Mountain,
  lake: Waves,
  design: PenTool,
  eco: Leaf,
  city: Building2,
};

/**
 * Horizontally scrollable filter chips (design-token styled). Selection is
 * local UI state only — filtering is wired to search in a later milestone.
 */
export function CategoryChips() {
  const [active, setActive] = useState<string>(CATEGORIES[0].id);

  return (
    <div
      role="tablist"
      aria-label="Stay categories"
      className="flex gap-3 overflow-x-auto scroll-hide -mx-4 px-4 md:mx-0 md:px-0 pb-1"
    >
      {CATEGORIES.map((cat) => {
        const Icon = ICONS[cat.icon] ?? Home;
        const isActive = active === cat.id;
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActive(cat.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-tinted"
                : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:border-primary/40 hover:text-primary",
            )}
          >
            <Icon aria-hidden className="size-4" strokeWidth={1.9} />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
