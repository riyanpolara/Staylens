import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { getHybridSearchStatus } from "@/lib/hybrid-search";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — deployment diagnostics.
 *
 * Reports configuration problems (missing vars, localhost URLs shipped to
 * production, malformed URLs) and the hybrid-search circuit state, so a bad
 * deploy is visible immediately instead of surfacing as "the site feels slow".
 * Deliberately leaks no secrets: only variable NAMES and booleans.
 */
export async function GET() {
  const env = getServerEnv();
  const hybrid = getHybridSearchStatus();

  const errors = env.problems.filter((p) => p.severity === "error");
  const warnings = env.problems.filter((p) => p.severity === "warning");

  const status = errors.length > 0 ? "error" : warnings.length > 0 ? "degraded" : "ok";

  return NextResponse.json(
    {
      status,
      environment: process.env.NODE_ENV,
      config: {
        supabase: env.supabaseUrl ? "configured" : "missing",
        supabaseKey: env.supabaseKey ? "configured" : "missing",
        siteUrl: env.siteUrl ?? "derived-from-request",
      },
      hybridSearch: {
        ...hybrid,
        note: hybrid.configured
          ? "Falls back to Supabase whenever unavailable — results stay correct."
          : "Not configured; search is served directly from Supabase.",
      },
      problems: env.problems.map(({ variable, severity, kind, message }) => ({
        variable,
        severity,
        kind,
        message,
      })),
    },
    { status: status === "error" ? 503 : 200 },
  );
}
