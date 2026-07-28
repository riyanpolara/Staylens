"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  ROLE_LABEL,
  USER_ROLES,
  USER_STATUSES,
  usersHref,
  type UserQuery,
} from "@/lib/admin/user-query";

/**
 * Search + role + status, all of it URL state.
 *
 * The query arrives as a prop rather than from `useSearchParams` so this stays a
 * leaf client component with no router subscription, and the server page remains
 * the single source of truth for what the table is showing.
 */

const SEARCH_DEBOUNCE_MS = 350;

export function UsersToolbar({ query }: { query: UserQuery }) {
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
      startTransition(() => router.replace(usersHref(query, { search: term }), { scroll: false }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [term, query, router]);

  const go = (overrides: Partial<UserQuery>) =>
    startTransition(() => router.replace(usersHref(query, overrides), { scroll: false }));

  return (
    <div className="admin-toolbar">
      <div className="admin-us-search">
        <span className="admin-us-search-icon" aria-hidden>
          <Search size={15} />
        </span>
        <input
          className="input"
          type="search"
          placeholder="Search users by name, email or country…"
          aria-label="Search users"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      <select
        className="btn btn-secondary admin-select"
        aria-label="Filter by role"
        value={query.role}
        onChange={(event) => go({ role: event.target.value as UserQuery["role"] })}
      >
        <option value="all">All roles</option>
        {USER_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABEL[role]}
          </option>
        ))}
      </select>

      <select
        className="btn btn-secondary admin-select"
        aria-label="Filter by status"
        value={query.status}
        onChange={(event) => go({ status: event.target.value as UserQuery["status"] })}
      >
        <option value="all">All statuses</option>
        {USER_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status[0].toUpperCase() + status.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
