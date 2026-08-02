"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  REVIEW_SOURCES,
  REVIEW_STATUSES,
  STATUS_LABEL,
  reviewsHref,
  type ReviewQuery,
  type ReviewStatusCounts,
} from "@/lib/admin/review-query";

/**
 * Search + status + rating + source, all of it URL state.
 *
 * The query arrives as a prop rather than from `useSearchParams` so this stays a
 * leaf client component with no router subscription, and the server page remains
 * the single source of truth for what the table is showing.
 */

const SEARCH_DEBOUNCE_MS = 350;

const SOURCE_LABEL: Record<string, string> = {
  mongodb_airbnb: "MongoDB import",
  inside_airbnb: "Inside Airbnb",
  staylens: "Written on StayLens",
};

export function ReviewsToolbar({
  query,
  counts,
}: {
  query: ReviewQuery;
  /** Queue-wide totals, so the chips stay meaningful while a filter is on. */
  counts: ReviewStatusCounts | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [term, setTerm] = useState(query.search);

  // Keep the box in step when the query changes from elsewhere (Clear filters,
  // back/forward) without fighting the admin mid-type.
  const committed = useRef(query.search);
  useEffect(() => {
    if (query.search !== committed.current) {
      committed.current = query.search;
      setTerm(query.search);
    }
  }, [query.search]);

  useEffect(() => {
    if (term === committed.current) return;
    const id = setTimeout(() => {
      committed.current = term;
      startTransition(() =>
        router.replace(reviewsHref(query, { search: term }), { scroll: false }),
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [term, query, router]);

  const go = (overrides: Partial<ReviewQuery>) =>
    startTransition(() => router.replace(reviewsHref(query, overrides), { scroll: false }));

  return (
    <div className="admin-toolbar">
      <div className="admin-us-search">
        <span className="admin-us-search-icon" aria-hidden>
          <Search size={15} />
        </span>
        <input
          className="input"
          type="search"
          placeholder="Search reviews by text, reviewer, property or host…"
          aria-label="Search reviews"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      <select
        className="btn btn-secondary admin-select"
        aria-label="Filter by status"
        value={query.status}
        onChange={(event) => go({ status: event.target.value as ReviewQuery["status"] })}
      >
        <option value="all">
          {counts ? `All statuses (${counts.all.toLocaleString()})` : "All statuses"}
        </option>
        {REVIEW_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABEL[status]}
            {counts ? ` (${counts[status].toLocaleString()})` : ""}
          </option>
        ))}
      </select>

      <select
        className="btn btn-secondary admin-select"
        aria-label="Filter by rating"
        value={query.rating ?? "all"}
        onChange={(event) =>
          go({ rating: event.target.value === "all" ? null : Number(event.target.value) })
        }
      >
        <option value="all">All ratings</option>
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n} star{n === 1 ? "" : "s"}
          </option>
        ))}
      </select>

      <select
        className="btn btn-secondary admin-select"
        aria-label="Filter by source"
        value={query.source}
        onChange={(event) => go({ source: event.target.value as ReviewQuery["source"] })}
      >
        <option value="all">All sources</option>
        {REVIEW_SOURCES.map((source) => (
          <option key={source} value={source}>
            {SOURCE_LABEL[source] ?? source}
          </option>
        ))}
      </select>
    </div>
  );
}
