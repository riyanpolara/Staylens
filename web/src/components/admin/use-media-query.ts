"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a media query as external state.
 *
 * Using useSyncExternalStore (rather than useState + useEffect) means the
 * viewport is never *copied* into React state, so there's no setState-in-effect
 * and no cascading render on resize. Returns false during SSR, matching the
 * desktop-first markup the server emits.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false, // server snapshot
  );
}
