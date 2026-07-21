"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type FaqItem = { q: string; a: string };

/** Reusable accordion for the "What most travelers ask" section. */
export function HostFaq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className="space-y-4">
      <h3 id="faq-heading" className="font-display text-xl md:text-2xl font-semibold text-primary">
        What most travelers ask
      </h3>
      <div className="space-y-3">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className="border border-outline-variant/30 rounded-xl bg-surface-container-lowest overflow-hidden shadow-tinted"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full px-5 py-4 flex items-center justify-between text-left gap-4"
              >
                <span className="font-semibold text-on-surface">{item.q}</span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "size-5 text-on-surface-variant transition-transform shrink-0",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-on-surface-variant border-t border-outline-variant/10 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
