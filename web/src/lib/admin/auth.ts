import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Just enough to label the header avatar — not a profile. */
export type AdminIdentity = { name: string; email: string; avatarUrl: string };

export type AdminCheck =
  | { state: "anonymous" }
  | { state: "forbidden"; userId: string }
  | { state: "admin"; userId: string; identity: AdminIdentity };

/**
 * Authoritative admin check, executed on the server.
 *
 * `getUser()` revalidates the JWT with Supabase Auth rather than trusting the
 * cookie, and the role is read from `profiles` — never from client-supplied
 * data or JWT claims a user could influence.
 */
export async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "anonymous" };

  // The identity columns ride along on the query the gate already runs — the
  // header needs a name, and a second round trip for three strings we are
  // fetching a row for anyway would be wasteful.
  const { data, error } = await supabase
    .from("profiles")
    .select("role, full_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // Fail closed: a missing row or a query error is NOT admin.
  if (error || data?.role !== "admin") {
    return { state: "forbidden", userId: user.id };
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaStr = (k: string) =>
    typeof meta[k] === "string" ? (meta[k] as string) : "";

  return {
    state: "admin",
    userId: user.id,
    identity: {
      // Same precedence as `lib/profile.ts`: the profiles row wins, then the
      // auth metadata an OAuth sign-in fills in.
      name: data.full_name ?? metaStr("full_name"),
      email: data.email ?? user.email ?? "",
      avatarUrl: data.avatar_url ?? metaStr("avatar_url") ?? "",
    },
  };
}
