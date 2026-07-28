import type { AiSearchEvent, StatSeriesPoint } from "@/lib/admin/types";

/**
 * Placeholder data for the ONE admin screen that is not yet backed by the
 * database: AI Search Analytics.
 *
 * Dashboard, Users, Properties and Bookings now read live Supabase data, so
 * their fixtures (KPIS, REVENUE_SERIES, PORTFOLIO_HEALTH, BOOKINGS_BY_MONTH,
 * PROPERTY_MIX, ACTIVITY, BOOKING_METRICS, BOOKINGS, USERS, PROPERTIES …) have
 * been deleted rather than left to rot beside the real queries.
 *
 * Everything below is dummy data. It goes when AI-search event logging lands
 * (see handoff-spec.md → `admin_ai_overview`).
 */

export const AI_METRICS = [
  { label: "Searches today", value: "11,264", delta: "+31.2%" },
  { label: "Success rate", value: "86.4%", delta: "+2.1 pts" },
  { label: "Avg response", value: "412ms", delta: "-38ms" },
  { label: "Embedding calls", value: "9,872", delta: "+18.6%" },
];

export const AI_LATENCY_SERIES: StatSeriesPoint[] = [
  { label: "00", value: 470 }, { label: "04", value: 442 }, { label: "08", value: 508 },
  { label: "12", value: 486 }, { label: "16", value: 431 }, { label: "20", value: 412 },
];

export const TOP_PROMPTS = [
  { prompt: "quiet beachfront villa with infinity pool", count: 1_284, success: 92 },
  { prompt: "cabin near northern lights", count: 976, success: 88 },
  { prompt: "pet friendly home with garden", count: 812, success: 84 },
  { prompt: "walkable city apartment under $150", count: 744, success: 79 },
  { prompt: "remote work stay with fast wifi", count: 690, success: 81 },
];

export const TRENDING_KEYWORDS = [
  { keyword: "infinity pool", delta: "+42%" },
  { keyword: "northern lights", delta: "+36%" },
  { keyword: "pet friendly", delta: "+21%" },
  { keyword: "hot tub", delta: "+18%" },
  { keyword: "sea view", delta: "+12%" },
];

export const AI_EVENTS: AiSearchEvent[] = [
  { id: "e1", user_id: "u1", prompt: "quiet beachfront villa with infinity pool", result_count: 24,
    clicked_property_id: "p1", booked: true, latency_ms: 388, embedding_tokens: 32, created_at: "2025-07-25T09:14:00Z" },
  { id: "e2", user_id: null, prompt: "cabin near northern lights", result_count: 18,
    clicked_property_id: "p2", booked: false, latency_ms: 421, embedding_tokens: 28, created_at: "2025-07-25T09:02:00Z" },
  { id: "e3", user_id: "u2", prompt: "walkable city apartment under $150", result_count: 0,
    clicked_property_id: null, booked: false, latency_ms: 502, embedding_tokens: 30, created_at: "2025-07-25T08:47:00Z" },
];
