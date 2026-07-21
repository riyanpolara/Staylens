"use client";

import { motion } from "framer-motion";
import { Search, TreePine } from "lucide-react";
import {
  formatGuests,
  formatWhen,
  type SearchField,
  type SearchState,
} from "@/components/search/search-types";

const SPRING = { type: "spring", stiffness: 400, damping: 34 } as const;

/**
 * Collapsed navbar pill (video's scrolled state):
 * [icon] Anywhere | Anytime | Add guests [search circle].
 * Clicking a segment re-expands the bar focused on that field.
 */
export function CompactSearch({
  state,
  onOpen,
  whereLabelPrefix,
}: {
  state: SearchState;
  onOpen: (field: SearchField) => void;
  /** e.g. "Homes in " on results pages (video behavior) */
  whereLabelPrefix?: string;
}) {
  const parts: { field: SearchField; text: string }[] = [
    {
      field: "where",
      text: state.where
        ? `${whereLabelPrefix ?? ""}${state.where}`
        : "Anywhere",
    },
    { field: "when", text: formatWhen(state, "Anytime") },
    { field: "who", text: formatGuests(state, "Add guests") },
  ];

  return (
    <motion.div
      layoutId="search-shell"
      transition={SPRING}
      className="flex items-center bg-surface-container-lowest border border-outline-variant/30 rounded-full shadow-tinted pl-4 pr-2 h-12"
    >
      <TreePine aria-hidden className="size-5 text-primary mr-1" strokeWidth={1.8} />
      {parts.map((part, i) => (
        <div key={part.field} className="flex items-center">
          <button
            type="button"
            onClick={() => onOpen(part.field)}
            className="px-3 py-2 text-sm font-semibold text-on-surface hover:text-primary transition-colors whitespace-nowrap"
            aria-label={`Open search: ${part.text}`}
          >
            {part.text}
          </button>
          {i < parts.length - 1 && (
            <span aria-hidden className="h-5 w-px bg-outline-variant/50" />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onOpen("where")}
        aria-label="Open search"
        className="cta-gradient text-white w-8 h-8 rounded-full flex items-center justify-center ml-1 hover:opacity-90 transition-opacity"
      >
        <Search aria-hidden className="size-3.5" strokeWidth={2.6} />
      </button>
    </motion.div>
  );
}
