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
};

const SIGNED_OUT: AuthState = {
  loading: false,
  user: null,
  displayName: null,
  initial: null,
  avatarUrl: null,
};

/**
 * Live auth state for client UI (the navbar). Reads the current Supabase user,
 * enriches it with the profile's name/avatar, and stays in sync via
 * onAuthStateChange so sign-in / sign-out update the UI without a reload.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ ...SIGNED_OUT, loading: true });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load(user: User | null) {
      if (!user) {
        if (active) setState(SIGNED_OUT);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, full_name, avatar_url")
        .eq("id", user.id)
        .single();
      const name =
        profile?.first_name ||
        profile?.full_name ||
        user.email?.split("@")[0] ||
        "You";
      if (active) {
        setState({
          loading: false,
          user,
          displayName: name,
          initial: name.charAt(0).toUpperCase(),
          avatarUrl: profile?.avatar_url ?? null,
        });
      }
    }

    supabase.auth.getUser().then(({ data }) => load(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      load(session?.user ?? null),
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
