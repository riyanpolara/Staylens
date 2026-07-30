"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleWishlist } from "@/app/wishlist/actions";

/**
 * One shared copy of the guest's saved property ids.
 *
 * Every heart on the page reads from here, so a save on a card and the same
 * property in a carousel below stay in step without any of them talking to each
 * other. Loaded lazily in one request after mount, which lets the pages
 * themselves stay statically rendered.
 */

type Ctx = {
  isSaved: (propertyId: string) => boolean;
  toggle: (propertyId: string) => Promise<void>;
  pendingIds: ReadonlySet<string>;
  ready: boolean;
};

const WishlistContext = createContext<Ctx | null>(null);

export function WishlistProvider({
  children,
  /** Ids known at render time (the wishlist page itself) — avoids a flash. */
  initialIds = [],
}: {
  children: React.ReactNode;
  initialIds?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ids, setIds] = useState<Set<string>>(() => new Set(initialIds));
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(initialIds.length > 0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wishlist")
      .then((r) => (r.ok ? r.json() : { ids: [] }))
      .then((d: { ids?: string[] }) => {
        if (cancelled) return;
        setIds(new Set(d.ids ?? []));
        setReady(true);
      })
      .catch(() => {
        // A failed load must not make hearts look unsaved and mislead —
        // they stay in their current state and the next toggle still works.
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isSaved = useCallback((id: string) => ids.has(id), [ids]);

  const toggle = useCallback(
    async (id: string) => {
      const wasSaved = ids.has(id);

      // Optimistic: flip immediately so the tap feels instant.
      setIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(id);
        else next.add(id);
        return next;
      });
      setPendingIds((prev) => new Set(prev).add(id));

      try {
        const res = await toggleWishlist(id);
        if (res.ok) {
          setIds((prev) => {
            const next = new Set(prev);
            if (res.saved) next.add(id);
            else next.delete(id);
            return next;
          });
          // Refresh server-rendered counts (profile stats, wishlist page).
          router.refresh();
          return;
        }

        // Roll back — the change did not happen.
        setIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(id);
          else next.delete(id);
          return next;
        });

        if (res.reason === "unauthenticated") {
          const back = `${pathname}${window.location.search}`;
          router.push(`/login?redirect=${encodeURIComponent(back)}`);
        }
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [ids, pathname, router],
  );

  const value = useMemo(
    () => ({ isSaved, toggle, pendingIds, ready }),
    [isSaved, toggle, pendingIds, ready],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist(): Ctx {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used inside <WishlistProvider>");
  }
  return ctx;
}
