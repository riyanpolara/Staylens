"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  formatGuests,
  formatWhen,
  type SearchField,
  type SearchState,
} from "@/components/search/search-types";

const SPRING = { type: "spring", stiffness: 400, damping: 34 } as const;

type SegmentDef = {
  id: SearchField;
  label: string;
  placeholder: string;
};

const SEGMENTS: SegmentDef[] = [
  { id: "where", label: "Where", placeholder: "Search destinations" },
  { id: "when", label: "When", placeholder: "Add dates" },
  { id: "who", label: "Who", placeholder: "Add guests" },
];

type SearchBarProps = {
  state: SearchState;
  active: SearchField | null;
  onActivate: (field: SearchField | null) => void;
  onWhereInput: (value: string) => void;
  /** clears a filled segment (✕ button, per the video) */
  onClear?: (field: SearchField) => void;
  onSubmit: () => void;
};

/**
 * Expanded search bar, replicating the video's states:
 *  - idle: white pill, dividers, circular gradient search button
 *  - field active: bar greys out, the active segment is a raised white pill
 *    (morphs between segments via layoutId), button grows a "Search" label
 */
export function SearchBar({
  state,
  active,
  onActivate,
  onWhereInput,
  onClear,
  onSubmit,
}: SearchBarProps) {
  const whereInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active === "where") whereInputRef.current?.focus();
  }, [active]);

  function valueFor(seg: SegmentDef): { text: string; filled: boolean } {
    if (seg.id === "where")
      return { text: state.where || seg.placeholder, filled: !!state.where };
    if (seg.id === "when") {
      const t = formatWhen(state, seg.placeholder);
      return { text: t, filled: t !== seg.placeholder };
    }
    const t = formatGuests(state, seg.placeholder);
    return { text: t, filled: t !== seg.placeholder };
  }

  return (
    <div
      role="search"
      aria-label="Search stays"
      className={cn(
        "flex items-center rounded-full border border-outline-variant/30 transition-colors duration-300 h-[66px] w-full max-w-[850px]",
        active ? "bg-surface-container-high/70" : "bg-surface-container-lowest shadow-tinted",
      )}
    >
      {SEGMENTS.map((seg, i) => {
        const isActive = active === seg.id;
        const { text, filled } = valueFor(seg);
        const nextActive = active === SEGMENTS[i + 1]?.id;
        return (
          <div key={seg.id} className={cn("relative flex items-stretch h-full", seg.id === "where" ? "flex-[1.3]" : "flex-1")}>
            {/* raised white pill behind the active segment (morphs between fields) */}
            {isActive && (
              <motion.span
                layoutId="segment-highlight"
                transition={SPRING}
                className="absolute inset-0 rounded-full bg-surface-container-lowest shadow-tinted-lg"
                aria-hidden
              />
            )}
            <button
              type="button"
              aria-expanded={isActive}
              aria-label={`${seg.label}: ${text}`}
              onClick={() => onActivate(isActive ? null : seg.id)}
              className={cn(
                "relative z-10 flex-1 flex flex-col justify-center text-left rounded-full px-8 py-3 min-w-0 transition-colors",
                !isActive && "hover:bg-surface-container/70",
              )}
            >
              <span className="text-xs font-semibold text-on-surface tracking-wide">
                {seg.label}
              </span>
              {seg.id === "where" && isActive ? (
                <input
                  ref={whereInputRef}
                  type="text"
                  value={state.where}
                  onChange={(e) => onWhereInput(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={seg.placeholder}
                  autoComplete="off"
                  className="border-none p-0 focus:ring-0 focus:outline-none bg-transparent text-sm font-medium text-on-surface placeholder:text-on-surface-variant/70 w-full"
                />
              ) : (
                <span
                  className={cn(
                    "text-sm truncate",
                    filled ? "font-semibold text-on-surface" : "text-on-surface-variant/80",
                  )}
                >
                  {text}
                </span>
              )}
            </button>
            {/* ✕ clear on filled active segment (video behavior) */}
            {isActive && filled && onClear && (
              <button
                type="button"
                aria-label={`Clear ${seg.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClear(seg.id);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <X aria-hidden className="size-4" />
              </button>
            )}
            {/* divider — hidden when this or the next segment is active */}
            {i < SEGMENTS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "self-center h-8 w-px bg-outline-variant/50 transition-opacity duration-200",
                  (isActive || nextActive) && "opacity-0",
                )}
              />
            )}
          </div>
        );
      })}

      {/* search button: circle when idle → labeled pill when a field is active */}
      <div className="pr-2.5 pl-1 z-10">
        <motion.button
          type="button"
          layout
          transition={SPRING}
          onClick={onSubmit}
          aria-label="Search"
          className="cta-gradient text-white h-12 rounded-full flex items-center justify-center gap-2 px-3.5 hover:opacity-90 active:scale-95 overflow-hidden"
        >
          <Search aria-hidden className="size-4 shrink-0" strokeWidth={2.6} />
          <AnimatePresence initial={false}>
            {active && (
              <motion.span
                key="label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-semibold whitespace-nowrap"
              >
                Search
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
