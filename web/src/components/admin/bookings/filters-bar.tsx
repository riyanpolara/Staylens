"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  BOOKING_STATUSES,
  PAGE_SIZE_OPTIONS,
  PAYMENT_STATUSES,
  bookingsHref,
  hasActiveFilters,
  type BookingQuery,
  type HrefOverrides,
} from "@/lib/admin/bookings-query";

/**
 * Filter controls for the bookings list.
 *
 * Every control writes to the URL and lets the Server Component re-query —
 * there is no client-side copy of the rows, so the filters cannot drift out of
 * step with what is on screen, and any view is a shareable link.
 *
 * The search box is uncontrolled (`defaultValue` + a ref). A controlled input
 * synced back from the URL would drop keystrokes typed while a navigation is
 * in flight; leaving the DOM node authoritative avoids that entirely.
 */

const DEBOUNCE_MS = 350;

function label(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export function FiltersBar({ query }: { query: BookingQuery }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function go(overrides: HrefOverrides, mode: "push" | "replace" = "push") {
    startTransition(() => {
      router[mode](bookingsHref(query, overrides), { scroll: false });
    });
  }

  /** Typing replaces the entry so a search doesn't leave 12 history steps. */
  function onSearchChange(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ search: value.trim() }, "replace"), DEBOUNCE_MS);
  }

  function submitSearchNow(e: React.FormEvent) {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    go({ search: searchRef.current?.value.trim() ?? "" }, "replace");
  }

  function clearAll() {
    if (timer.current) clearTimeout(timer.current);
    if (searchRef.current) searchRef.current.value = "";
    startTransition(() => {
      router.push("/admin/bookings", { scroll: false });
    });
  }

  const active = hasActiveFilters(query);

  return (
    <div className="admin-bk-filters" data-pending={pending || undefined}>
      <form className="admin-bk-search" role="search" onSubmit={submitSearchNow}>
        <Search size={15} aria-hidden className="admin-bk-search-icon" />
        <input
          ref={searchRef}
          className="input"
          type="search"
          name="q"
          defaultValue={query.search}
          placeholder="Search reference, guest, property, city or host…"
          aria-label="Search bookings"
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {/* Submitting is optional — it just skips the debounce. */}
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>

      <div className="seg" role="group" aria-label="Filter by booking status">
        {(["all", ...BOOKING_STATUSES] as const).map((s) => (
          <label key={s} className="seg-opt">
            <input
              type="radio"
              name="booking-status"
              checked={query.status === s}
              onChange={() => go({ status: s })}
            />
            {s === "all" ? "All" : label(s)}
          </label>
        ))}
      </div>

      <label className="admin-bk-field">
        <span className="admin-bk-field-label">Payment</span>
        <select
          className="input"
          value={query.payment}
          onChange={(e) => go({ payment: e.target.value as BookingQuery["payment"] })}
        >
          <option value="all">Any</option>
          {PAYMENT_STATUSES.map((p) => (
            <option key={p} value={p}>
              {label(p)}
            </option>
          ))}
        </select>
      </label>

      {/* Matches stays that OVERLAP the window, not just those starting in it —
          an operator looking at "this week" wants the guests who are mid-stay. */}
      <label className="admin-bk-field">
        <span className="admin-bk-field-label">Staying from</span>
        <input
          className="input"
          type="date"
          value={query.from ?? ""}
          max={query.to ?? undefined}
          onChange={(e) => go({ from: e.target.value || null })}
        />
      </label>

      <label className="admin-bk-field">
        <span className="admin-bk-field-label">to</span>
        <input
          className="input"
          type="date"
          value={query.to ?? ""}
          min={query.from ?? undefined}
          onChange={(e) => go({ to: e.target.value || null })}
        />
      </label>

      <label className="admin-bk-field">
        <span className="admin-bk-field-label">Per page</span>
        <select
          className="input"
          value={query.pageSize}
          onChange={(e) => go({ pageSize: Number(e.target.value) })}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      {active && (
        <button type="button" className="btn btn-ghost admin-bk-clear" onClick={clearAll}>
          <X size={15} aria-hidden />
          Clear filters
        </button>
      )}
    </div>
  );
}
