import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/stats — user registration statistics for the future Admin
 * Dashboard. Requires an authenticated user whose profile role is 'admin'.
 * The counts are computed by the SECURITY DEFINER `get_user_stats()` function,
 * invoked with the service-role key (server-only).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    // get_user_stats() isn't in the generated types until they're regenerated
    // after the migration — cast past the typed rpc signature.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.rpc as any)("get_user_stats");
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("[admin/stats] failed:", err);
    return NextResponse.json(
      { error: "Stats unavailable" },
      { status: 500 },
    );
  }
}
