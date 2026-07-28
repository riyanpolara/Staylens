"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";
import { WhenPanel, WhoPanel } from "@/components/search/search-panels";
import type {
  DestinationSuggestion,
  SearchState,
} from "@/components/search/search-types";

const DATE_FMT = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

type Section = "where" | "when" | "who";

/**
 * Full-screen mobile search sheet. The desktop search bar and its dropdown
 * panels are fixed-width (400–560px) and `hidden md:block`, so phones had no
 * working search. This reuses the same When/Who panels (in a horizontal
 * scroller so their fixed layout stays usable) plus a full-width destination
 * picker, as an accordion — one section open at a time, like Airbnb mobile.
 */
export function MobileSearch({
  suggestions,
  state,
  onWhereInput,
  onWherePick,
  onWhenChange,
  onWhoChange,
  onClear,
  onSubmit,
  onClose,
}: {
  suggestions: DestinationSuggestion[];
  state: SearchState;
  onWhereInput: (v: string) => void;
  onWherePick: (label: string) => void;
  onWhenChange: (next: Partial<SearchState>) => void;
  onWhoChange: (guests: SearchState["guests"]) => void;
  onClear: () => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<Section>("where");

  const q = state.where.trim().toLowerCase();
  const filtered = q
    ? suggestions.filter((s) => s.label.toLowerCase().includes(q))
    : suggestions;

  const guestTotal =
    state.guests.adults + state.guests.children + state.guests.infants;
  const whenLabel =
    state.checkIn && state.checkOut
      ? `${DATE_FMT.format(state.checkIn)} – ${DATE_FMT.format(state.checkOut)}`
      : state.checkIn
        ? DATE_FMT.format(state.checkIn)
        : "Add dates";
  const whoLabel = guestTotal > 0 ? `${guestTotal} guest${guestTotal === 1 ? "" : "s"}` : "Add guests";

  function toggle(s: Section) {
    setOpen((cur) => (cur === s ? cur : s));
  }

  return (
    <div className="md:hidden fixed inset-0 z-[70] bg-surface-container-low flex flex-col">
      {/* top bar */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-outline-variant/30 bg-surface shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="w-9 h-9 rounded-full border border-outline-variant/60 flex items-center justify-center text-on-surface hover:border-on-surface transition-colors"
        >
          <X aria-hidden className="size-5" />
        </button>
        <span className="font-display text-lg font-semibold text-on-surface">
          Search stays
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-semibold text-on-surface underline underline-offset-4"
        >
          Clear
        </button>
      </div>

      {/* scrolling accordion */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* WHERE */}
        <section className="bg-surface rounded-3xl shadow-tinted overflow-hidden">
          <button
            type="button"
            onClick={() => toggle("where")}
            className="w-full flex items-center justify-between px-5 py-4"
            aria-expanded={open === "where"}
          >
            <span className="text-sm font-semibold text-on-surface-variant">Where</span>
            {open !== "where" && (
              <span className="text-base font-semibold text-on-surface truncate ml-4">
                {state.where || "Anywhere"}
              </span>
            )}
          </button>
          {open === "where" && (
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3 h-12 rounded-full border border-outline-variant/50 px-4 mb-4">
                <Search aria-hidden className="size-4 text-primary shrink-0" strokeWidth={2.4} />
                <input
                  autoFocus
                  value={state.where}
                  onChange={(e) => onWhereInput(e.target.value)}
                  placeholder="Search destinations"
                  className="flex-1 bg-transparent outline-none text-base text-on-surface placeholder:text-on-surface-variant"
                />
              </div>
              <ul role="listbox" aria-label="Suggested destinations" className="max-h-[38vh] overflow-y-auto scroll-hide">
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onWherePick(s.label);
                        setOpen("when");
                      }}
                      className="w-full flex items-center gap-4 rounded-2xl px-2 py-3 hover:bg-surface-container-low transition-colors text-left"
                    >
                      <span className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 text-primary text-sm font-semibold">
                        {s.label.slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-on-surface truncate">{s.label}</span>
                        <span className="block text-sm text-on-surface-variant truncate">{s.sub}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-2 py-3 text-on-surface-variant text-sm">No matching destinations</li>
                )}
              </ul>
            </div>
          )}
        </section>

        {/* WHEN */}
        <section className="bg-surface rounded-3xl shadow-tinted overflow-hidden">
          <button
            type="button"
            onClick={() => toggle("when")}
            className="w-full flex items-center justify-between px-5 py-4"
            aria-expanded={open === "when"}
          >
            <span className="text-sm font-semibold text-on-surface-variant">When</span>
            {open !== "when" && (
              <span className="text-base font-semibold text-on-surface ml-4">{whenLabel}</span>
            )}
          </button>
          {open === "when" && (
            <div className="overflow-x-auto scroll-hide">
              <WhenPanel state={state} onChange={onWhenChange} />
            </div>
          )}
        </section>

        {/* WHO */}
        <section className="bg-surface rounded-3xl shadow-tinted overflow-hidden">
          <button
            type="button"
            onClick={() => toggle("who")}
            className="w-full flex items-center justify-between px-5 py-4"
            aria-expanded={open === "who"}
          >
            <span className="text-sm font-semibold text-on-surface-variant">Who</span>
            {open !== "who" && (
              <span className="text-base font-semibold text-on-surface ml-4">{whoLabel}</span>
            )}
          </button>
          {open === "who" && (
            <div className="overflow-x-auto scroll-hide">
              <WhoPanel guests={state.guests} onChange={onWhoChange} />
            </div>
          )}
        </section>
      </div>

      {/* footer search button */}
      <div className="p-4 border-t border-outline-variant/30 bg-surface shrink-0">
        <button
          type="button"
          onClick={onSubmit}
          className="w-full h-14 rounded-full cta-gradient text-white font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
        >
          <Search aria-hidden className="size-5" strokeWidth={2.4} />
          Search
        </button>
      </div>
    </div>
  );
}
