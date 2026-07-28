import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AdminCheck =
  | { state: "anonymous" }
  | { state: "forbidden"; userId: string }
  | { state: "admin"; userId: string };

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

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // Fail closed: a missing row or a query error is NOT admin.
  if (error || data?.role !== "admin") {
    return { state: "forbidden", userId: user.id };
  }
  return { state: "admin", userId: user.id };
}
