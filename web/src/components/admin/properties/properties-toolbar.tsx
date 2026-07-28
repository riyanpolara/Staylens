"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PROPERTY_STATUSES,
  ROOM_TYPES,
  propertyHref,
  type PropertyQuery,
} from "@/lib/admin/property-query";

/**
 * Search + status + type, all of it URL state.
 *
 * The query arrives as a prop rather than from `useSearchParams` so this stays
 * a leaf client component with no router subscription, and the server page
 * remains the single source of truth for what the table is showing.
 */

const SEARCH_DEBOUNCE_MS = 350;

export function PropertiesToolbar({ query }: { query: PropertyQuery }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [term, setTerm] = useState(query.q);

  /** Last value pushed to the URL — the yardstick for "has this been sent yet". */
  const committed = useRef(query.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => clearPending, []);

  // Follow the query when it changes from elsewhere — "Clear filters",
  // browser back/forward — without fighting the user mid-type.
  useEffect(() => {
    if (query.q !== committed.current) {
      committed.current = query.q;
      setTerm(query.q);
    }
  }, [query.q]);

  /** Any commit cancels a pending debounce, so a filter click can never be
   *  overwritten a moment later by a stale search timer. */
  const commit = (patch: Partial<PropertyQuery>) => {
    clearPending();
    if (patch.q !== undefined) committed.current = patch.q;
    startTransition(() => router.replace(propertyHref(query, patch)));
  };

  const onSearch = (value: string) => {
    setTerm(value);
    clearPending();
    timer.current = setTimeout(() => commit({ q: value }), SEARCH_DEBOUNCE_MS);
  };

  // Filters carry the typed term along, so a half-finished search is not lost.
  const onFilter = (patch: Partial<PropertyQuery>) => commit({ q: term, ...patch });

  return (
    <div className="admin-toolbar">
      <input
        className="input"
        type="search"
        placeholder="Search title, host or city…"
        aria-label="Search properties"
        value={term}
        onChange={(event) => onSearch(event.target.value)}
      />

      <select
        className="btn btn-secondary admin-select"
        aria-label="Filter by status"
        value={query.status}
        onChange={(event) => onFilter({ status: event.target.value as PropertyQuery["status"] })}
      >
        <option value="all">All statuses</option>
        {PROPERTY_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status[0].toUpperCase() + status.slice(1)}
          </option>
        ))}
      </select>

      <select
        className="btn btn-secondary admin-select"
        aria-label="Filter by type"
        value={query.type}
        onChange={(event) => onFilter({ type: event.target.value as PropertyQuery["type"] })}
      >
        <option value="all">All types</option>
        {ROOM_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <button type="button" className="btn btn-primary" style={{ marginInlineStart: "auto" }}>
        Add property
      </button>
    </div>
  );
}
