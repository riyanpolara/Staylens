import "server-only";
import { getServerEnv } from "@/lib/env";
import type { ExploreStay, MatchScore, StaySearchResult } from "@/lib/queries";
import type { StaySearchParams } from "@/lib/stay-filters";

/**
 * Client for the FastAPI Hybrid Search backend (semantic + FTS + filters +
 * ranking). Called server-side from /search. Maps the existing StaySearchParams
 * (frontend filter vocabulary) onto the hybrid request and the hybrid response
 * back onto the ExploreStay shape the UI already renders — so the search UI is
 * unchanged. Returns null on any failure/timeout so the caller can fall back to
 * the direct-Supabase path (semantic search stays an enhancement, not a hard
 * dependency).
 *
 * Availability strategy: the backend may be on a free tier that sleeps and
 * cold-starts for ~50s. Waiting that out would make every search feel frozen,
 * so we (a) cap each attempt with a short AbortController timeout and (b) trip a
 * circuit breaker after repeated failures, which makes subsequent searches skip
 * the network entirely and answer immediately from Supabase. Results stay
 * correct either way — only ranking quality degrades.
 */

/* ---- circuit breaker (per server instance) ----------------------------- */

/**
 * The breaker exists to stop us queueing behind a backend that is *down*. It
 * must not fire because the backend is merely slow — a slow answer is still a
 * correct answer, and skipping the network turns one slow request into minutes
 * of degraded ranking for everyone.
 *
 * Thresholds are per failure kind, because the kinds mean very different things:
 *
 *   connection  nothing is listening. Unambiguous — trip quickly.
 *   server      repeated 5xx. The backend is up but broken — trip after a few.
 *   malformed   answered, but not with our contract. Treated like 5xx.
 *   timeout     usually just slow (cold start, a heavy query). Only a long
 *               unbroken run suggests it is genuinely hung.
 *
 * Measured against the real latency distribution, letting a timeout trip the
 * breaker at threshold 2 turned a 15% timeout rate into 39% degraded searches
 * when users refined queries a couple of seconds apart — most of that was the
 * breaker skipping a backend that was working.
 */
const THRESHOLDS = {
  connection: 2,
  server: 3,
  malformed: 3,
  timeout: 6,
} as const;

const COOLDOWN_BASE_MS = 30_000;
const COOLDOWN_MAX_MS = 5 * 60_000;

type FailureKind = "timeout" | "connection" | "server" | "malformed";

type BreakerState = {
  consecutiveFailures: number;
  /** Kind of the current failure run — a different kind restarts the count. */
  failureKind: FailureKind | null;
  circuitOpenUntil: number;
};

/**
 * Held on globalThis rather than in module scope.
 *
 * Next.js bundles route handlers and pages separately, so each gets its own
 * copy of this module and, with plain `let`, its own private counters. The
 * search path would open its breaker while /api/health reported zero failures
 * from an instance that never sees traffic — diagnostics that quietly lie.
 * One shared object means every entry point reads and writes the same state.
 */
const globalForBreaker = globalThis as typeof globalThis & {
  __staylensHybridBreaker?: BreakerState;
};

const breaker: BreakerState = (globalForBreaker.__staylensHybridBreaker ??= {
  consecutiveFailures: 0,
  failureKind: null,
  circuitOpenUntil: 0,
});

function recordFailure(kind: FailureKind, detail: string, elapsedMs: number) {
  // A run only counts if it is the same kind of failure repeating; a timeout
  // followed by a connection error is two separate signals, not an escalation.
  if (kind !== breaker.failureKind) {
    breaker.failureKind = kind;
    breaker.consecutiveFailures = 0;
  }
  breaker.consecutiveFailures += 1;

  const threshold = THRESHOLDS[kind];
  if (breaker.consecutiveFailures >= threshold) {
    const backoff = Math.min(
      COOLDOWN_BASE_MS * 2 ** (breaker.consecutiveFailures - threshold),
      COOLDOWN_MAX_MS,
    );
    breaker.circuitOpenUntil = Date.now() + backoff;
    console.warn(
      `[hybrid-search] ${kind} after ${elapsedMs}ms (${detail}); ` +
        `${breaker.consecutiveFailures} consecutive — circuit open for ` +
        `${Math.round(backoff / 1000)}s, serving Supabase results.`,
    );
  } else {
    console.warn(
      `[hybrid-search] ${kind} after ${elapsedMs}ms (${detail}); ` +
        `falling back (${breaker.consecutiveFailures}/${threshold} before circuit opens).`,
    );
  }
}

/**
 * The backend answered correctly but we chose not to wait, or it returned a 4xx.
 * Neither says anything about backend health, so neither may move the breaker —
 * but both still fall back to Supabase for this request.
 */
function recordNonFailure(reason: string, elapsedMs: number) {
  console.warn(`[hybrid-search] ${reason} after ${elapsedMs}ms; falling back.`);
}

function recordSuccess() {
  if (breaker.consecutiveFailures > 0 || breaker.circuitOpenUntil > 0) {
    console.info("[hybrid-search] backend healthy again; circuit closed.");
  }
  breaker.consecutiveFailures = 0;
  breaker.failureKind = null;
  breaker.circuitOpenUntil = 0;
}

type HybridProperty = {
  id: string;
  name: string;
  location: string;
  city: string | null;
  country: string | null;
  price: number | null;
  rating: number | null;
  reviews: number;
  image: string | null;
  latitude: number | null;
  longitude: number | null;
  superhost: boolean;
  beds: number | null;
  bathrooms: number | null;
  scores?: {
    semantic: number;
    text: number;
    rating: number;
    reviews: number;
    superhost: number;
    amenity: number;
    popularity: number;
    final: number;
  };
  explanation?: string[];
};

type HybridResponse = {
  properties: HybridProperty[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
  meta: { semantic_enabled: boolean; intent_detected: string[] };
};

/**
 * "in" only when the query IS the place (e.g. "Barcelona" → "homes in
 * Barcelona"). Descriptive queries — including ones that merely mention a
 * place ("private pool in austin") — read better as "homes with …".
 */
function wherePreposition(where: string, detected: string[]): "in" | "with" {
  const q = where.trim().toLowerCase();
  if (!q) return "in";
  const places = detected
    .filter((d) => d.startsWith("city:") || d.startsWith("country:"))
    .map((d) => d.slice(d.indexOf(":") + 1).trim().toLowerCase());
  return places.includes(q) ? "in" : "with";
}

function toHybridBody(params: StaySearchParams) {
  const filters: Record<string, unknown> = {};
  if (params.price) {
    const [min, max] = params.price.split("-");
    if (min) filters.price_min = Number(min);
    if (max) filters.price_max = Number(max);
  }
  if (params.guests) filters.guests = params.guests;
  if (params.beds) filters.bedrooms = params.beds;
  if (params.bath) filters.bathrooms = params.bath;
  if (params.type) filters.room_type = params.type;
  if (params.ptype) filters.property_type = params.ptype;
  if (params.amenities?.length) filters.amenities = params.amenities;
  if (params.fav) {
    filters.rating_min = 4.9;
    filters.reviews_min = 50;
  }
  if (params.luxe) {
    filters.price_min = Math.max((filters.price_min as number) ?? 0, 500);
    filters.rating_min = Math.max((filters.rating_min as number) ?? 0, 4.5);
  }
  return {
    query: params.where?.trim() ?? "",
    filters,
    sort: params.sort ?? "recommended",
    page: params.page ?? 1,
    page_size: params.perPage ?? 24,
  };
}

/**
 * The AI Match, or null.
 *
 * Null unless the engine actually scored a semantic signal. A filter-only
 * browse still produces a `final` — the engine drops `semantic` and
 * renormalizes — but that number answers "how good is this listing", not "how
 * well does it match what you asked for", and showing it as a Match would be a
 * percentage with nothing behind it.
 */
function toMatch(p: HybridProperty): MatchScore | null {
  const s = p.scores;
  if (!s || !(s.semantic > 0)) return null;
  const score = Math.round(s.final * 100);
  if (!Number.isFinite(score) || score <= 0) return null;
  return {
    score: Math.min(100, score),
    signals: {
      semantic: s.semantic,
      text: s.text,
      rating: s.rating,
      reviews: s.reviews,
      superhost: s.superhost,
      amenity: s.amenity,
      popularity: s.popularity,
    },
    explanation: p.explanation ?? [],
  };
}

function toExploreStay(p: HybridProperty): ExploreStay {
  // `?? 0` here would have reported an unrated listing as 0.0 out of 5.
  const rating = typeof p.rating === "number" ? p.rating : null;
  return {
    id: p.id,
    name: p.name,
    location: p.location,
    price: Math.round(p.price ?? 0),
    rating,
    reviews: p.reviews,
    images: p.image ? [{ url: p.image, alt: p.name }] : [],
    isSuperhost: p.superhost,
    isRareFind: rating !== null && rating >= 4.95,
    latitude: p.latitude,
    longitude: p.longitude,
    beds: p.beds,
    bathrooms: p.bathrooms,
    match: toMatch(p),
  };
}

export async function searchStaysHybrid(
  params: StaySearchParams,
): Promise<StaySearchResult | null> {
  const { hybridSearchUrl, hybridTimeoutMs } = getServerEnv();

  // Unset, malformed, or localhost-in-production → never attempt the request.
  // env.ts has already logged why; returning null keeps search instant.
  if (!hybridSearchUrl) return null;

  // Breaker open: skip the network entirely so the user isn't made to wait
  // again for a backend we already know is down or still cold-starting.
  if (Date.now() < breaker.circuitOpenUntil) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), hybridTimeoutMs);
  const startedAt = Date.now();

  try {
    const res = await fetch(`${hybridSearchUrl}/api/search/hybrid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toHybridBody(params)),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      const elapsed = Date.now() - startedAt;
      if (res.status >= 500) {
        recordFailure("server", `HTTP ${res.status}`, elapsed);
      } else {
        // 4xx means the backend is healthy and rejected *our* request — a bad
        // filter combination, say. Opening the breaker would punish a working
        // backend for our bug, and would not fix anything.
        recordNonFailure(`HTTP ${res.status} (request rejected, backend healthy)`, elapsed);
      }
      return null;
    }

    let data: HybridResponse;
    try {
      data = (await res.json()) as HybridResponse;
    } catch {
      recordFailure("malformed", "response was not valid JSON", Date.now() - startedAt);
      return null;
    }

    if (!data?.properties || !data?.pagination) {
      recordFailure("malformed", "response missing properties/pagination", Date.now() - startedAt);
      return null;
    }

    recordSuccess();
    return {
      items: data.properties.map(toExploreStay),
      wherePreposition: wherePreposition(
        params.where ?? "",
        data.meta?.intent_detected ?? [],
      ),
      total: data.pagination.total,
      page: data.pagination.page,
      perPage: data.pagination.page_size,
      totalPages: data.pagination.total_pages,
    };
  } catch (err) {
    // Distinguish "we gave up waiting" (likely a cold start) from "nothing is
    // listening" — they need very different operational responses.
    const elapsed = Date.now() - startedAt;
    const aborted =
      controller.signal.aborted || (err as Error)?.name === "AbortError";
    if (aborted) {
      recordFailure(
        "timeout",
        `exceeded ${hybridTimeoutMs}ms — backend slow or cold-starting`,
        elapsed,
      );
    } else {
      const cause = (err as { cause?: { code?: string } })?.cause?.code;
      recordFailure("connection", cause ?? (err as Error)?.message ?? "unreachable", elapsed);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Diagnostics for the health endpoint — no secrets. */
export function getHybridSearchStatus() {
  const { hybridSearchUrl, hybridTimeoutMs } = getServerEnv();
  return {
    configured: hybridSearchUrl !== null,
    timeoutMs: hybridTimeoutMs,
    circuitOpen: Date.now() < breaker.circuitOpenUntil,
    consecutiveFailures: breaker.consecutiveFailures,
    // Which signal is accumulating matters when diagnosing: a timeout run means
    // "slow", a connection run means "gone".
    failureKind: breaker.failureKind,
    failureThreshold: breaker.failureKind ? THRESHOLDS[breaker.failureKind] : null,
    retryInMs: Math.max(0, breaker.circuitOpenUntil - Date.now()),
  };
}
