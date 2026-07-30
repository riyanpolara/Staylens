import "server-only";

/**
 * Server-side environment validation.
 *
 * Configuration mistakes (a localhost URL shipped to production, a missing key)
 * are silent in Next — the app builds fine and then misbehaves at runtime. This
 * module validates every server-consumed variable once, classifies the problems,
 * and lets each caller degrade safely rather than crash.
 */

const IS_PROD = process.env.NODE_ENV === "production";

/** Hosts that must never be reachable from a deployed environment. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

export type EnvProblem = {
  variable: string;
  severity: "error" | "warning";
  kind: "missing" | "localhost-in-production" | "invalid-url";
  message: string;
};

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".local");
}

/**
 * Parses a URL env var and reports why it is unusable, if it is.
 * `allowLocal` is true outside production, where localhost is the norm.
 */
function checkUrl(
  variable: string,
  raw: string | undefined,
  { required }: { required: boolean },
): { url: URL | null; problem: EnvProblem | null } {
  if (!raw || raw.trim() === "") {
    return {
      url: null,
      problem: required
        ? {
            variable,
            severity: "error",
            kind: "missing",
            message: `${variable} is not set.`,
          }
        : null,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return {
      url: null,
      problem: {
        variable,
        severity: "error",
        kind: "invalid-url",
        message: `${variable} is not a valid absolute URL: "${raw}".`,
      },
    };
  }

  if (IS_PROD && isLocalHost(parsed.hostname)) {
    return {
      url: null,
      problem: {
        variable,
        severity: "error",
        kind: "localhost-in-production",
        message:
          `${variable} points at ${parsed.hostname} in production. ` +
          `A deployed server cannot reach a developer machine; the request would ` +
          `hang until it times out. Treating it as unconfigured.`,
      },
    };
  }

  return { url: parsed, problem: null };
}

let cached: ServerEnv | null = null;

export type ServerEnv = {
  supabaseUrl: string | null;
  supabaseKey: string | null;
  /** null when unset, invalid, or localhost-in-production (→ skip hybrid). */
  hybridSearchUrl: string | null;
  hybridTimeoutMs: number;
  siteUrl: string | null;
  problems: EnvProblem[];
};

/** Validated server environment (computed once per process). */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const problems: EnvProblem[] = [];

  const supabase = checkUrl("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL, {
    required: true,
  });
  if (supabase.problem) problems.push(supabase.problem);

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    null;
  if (!supabaseKey) {
    problems.push({
      variable: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      severity: "error",
      kind: "missing",
      message: "No Supabase publishable/anon key is set.",
    });
  }

  const hybrid = checkUrl("HYBRID_SEARCH_URL", process.env.HYBRID_SEARCH_URL, {
    required: false,
  });
  // A hybrid misconfiguration is recoverable — search falls back to Supabase.
  if (hybrid.problem) problems.push({ ...hybrid.problem, severity: "warning" });

  const site = checkUrl("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL, {
    required: false,
  });
  if (site.problem) problems.push({ ...site.problem, severity: "warning" });

  /**
   * 6s, chosen from measured latency rather than a guess.
   *
   * The previous 2.5s was below the p95 of every dataset we have, so it was
   * cancelling healthy requests that the backend went on to answer 200 OK:
   *
   *   154 logged production searches  median 1227 · p90 2824 · p95 3370 · max 13068
   *   30 fresh warm requests          median  993 · p90 1638 · p95 2490 · max  2584
   *   cold start (first after boot)   3133 ms — over the old limit every time
   *
   * 6000 ms is ~1.8x the production p95 and ~2x cold start, and cancels ~3% of
   * real requests instead of ~15%. The remainder is a genuinely pathological
   * tail (8-13s) that a user should not be made to wait for — the Supabase
   * fallback answers those immediately.
   */
  const rawTimeout = Number(process.env.HYBRID_SEARCH_TIMEOUT_MS);
  const hybridTimeoutMs =
    Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 6000;

  cached = {
    supabaseUrl: supabase.url?.toString().replace(/\/$/, "") ?? null,
    supabaseKey,
    hybridSearchUrl: hybrid.url ? hybrid.url.toString().replace(/\/$/, "") : null,
    hybridTimeoutMs,
    siteUrl: site.url ? site.url.toString().replace(/\/$/, "") : null,
    problems,
  };

  for (const p of problems) {
    const line = `[env] ${p.severity.toUpperCase()} ${p.variable}: ${p.message}`;
    if (p.severity === "error") console.error(line);
    else console.warn(line);
  }

  return cached;
}
