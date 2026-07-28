"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type AuthState = {
  loading: boolean;
  user: User | null;
  displayName: string | null;
  initial: string | null;
  avatarUrl: string | null;
  /** Convenience flag for the menu. Server-side checks remain authoritative. */
  isAdmin: boolean;
};

const SIGNED_OUT: AuthState = {
  loading: false,
  user: null,
  displayName: null,
  initial: null,
  avatarUrl: null,
  isAdmin: false,
};

/** Best-effort label before the profile row arrives. */
function fallbackName(user: User): string {
  const meta = user.user_metadata as { first_name?: string; full_name?: string } | undefined;
  return (
    meta?.first_name?.trim() ||
    meta?.full_name?.trim().split(" ")[0] ||
    user.email?.split("@")[0] ||
    "You"
  );
}

/**
 * Live auth state for client UI (the navbar).
 *
 * Two deliberate details:
 *
 * 1. `onAuthStateChange` must NOT await another Supabase call. The auth client
 *    holds an internal lock for the duration of the callback, so awaiting
 *    `from("profiles")` inside it can deadlock — the promise never settles, the
 *    state never updates, and the header keeps showing "signed out" even though
 *    the user just logged in. The listener therefore only sets the user
 *    synchronously.
 *
 * 2. The profile lookup (name / avatar / role) runs in its own effect, keyed on
 *    the user id. The header can show the signed-in state immediately and fill
 *    in the details a moment later, instead of blocking on a query.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ ...SIGNED_OUT, loading: true });

  // ---- session: synchronous listener, no awaits inside the callback --------
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const apply = (user: User | null) => {
      if (!active) return;
      if (!user) {
        setState(SIGNED_OUT);
        return;
      }
      const name = fallbackName(user);
      setState((prev) => ({
        // keep any profile detail already loaded for this same user
        ...(prev.user?.id === user.id ? prev : SIGNED_OUT),
        loading: false,
        user,
        displayName: prev.user?.id === user.id ? prev.displayName ?? name : name,
        initial: (prev.user?.id === user.id ? prev.displayName ?? name : name)
          .charAt(0)
          .toUpperCase(),
      }));
    };

    supabase.auth.getUser().then(({ data }) => apply(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // synchronous only — see note above
      apply(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // ---- profile detail: separate effect, safe to await ----------------------
  const userId = state.user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let active = true;

    (async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("first_name, full_name, avatar_url, role")
        .eq("id", userId)
        .maybeSingle(); // no row -> null, not an error

      if (!active || error) return;
      setState((prev) => {
        if (prev.user?.id !== userId) return prev; // user changed mid-flight
        const name =
          profile?.first_name || profile?.full_name || prev.displayName || "You";
        return {
          ...prev,
          displayName: name,
          initial: name.charAt(0).toUpperCase(),
          avatarUrl: profile?.avatar_url ?? null,
          isAdmin: profile?.role === "admin",
        };
      });
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  return state;
}
