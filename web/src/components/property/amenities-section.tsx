"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { amenityIcon } from "@/components/shared/amenity-icon";

type Amenity = { name: string; slug: string; category: string | null };

function Row({ a }: { a: Amenity }) {
  const Icon = amenityIcon(a.slug || a.name);
  return (
    <div className="flex items-center gap-4 text-on-surface-variant py-1">
      <Icon aria-hidden className="size-5 text-primary shrink-0" strokeWidth={1.7} />
      <span>{a.name}</span>
    </div>
  );
}

/** "What this place offers" — first 8 amenities + a modal with the full list. */
export function AmenitiesSection({ amenities }: { amenities: Amenity[] }) {
  const [open, setOpen] = useState(false);
  const preview = amenities.slice(0, 8);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (amenities.length === 0) return null;

  // group by category for the modal
  const groups = new Map<string, Amenity[]>();
  for (const a of amenities) {
    const g = a.category ?? "More";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(a);
  }

  return (
    <section aria-labelledby="amenities-heading">
      <h2 id="amenities-heading" className="font-display text-xl md:text-2xl font-semibold text-primary mb-6">
        What this place offers
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-12">
        {preview.map((a) => (
          <Row key={a.slug} a={a} />
        ))}
      </div>
      {amenities.length > 8 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-8 px-6 py-3 rounded-lg border-[1.5px] border-primary text-primary font-semibold hover:bg-surface-container-low transition-all"
        >
          Show all {amenities.length} amenities
        </button>
      )}

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-on-surface/40"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="All amenities"
              className="relative bg-surface-container-lowest w-full max-w-lg max-h-[85vh] rounded-3xl shadow-tinted-lg flex flex-col overflow-hidden"
            >
              <div className="relative flex items-center justify-center h-14 border-b border-outline-variant/30 shrink-0">
                <h3 className="font-semibold">What this place offers</h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="absolute right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6">
                {[...groups.entries()].map(([group, items]) => (
                  <div key={group} className="mb-6">
                    <p className="font-semibold capitalize text-on-surface-variant mb-3">{group}</p>
                    <div className="flex flex-col gap-1">
                      {items.map((a) => (
                        <Row key={a.slug} a={a} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
