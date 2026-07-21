"use client";

/**
 * Browser-side search helpers for the Filters modal:
 *  - live result count for the "Show N places" button
 *  - price sample for the histogram
 * Uses the anon browser client (catalog is public-read under RLS).
 */

import { createClient } from "@/lib/supabase/client";
import {
  amenitySelectSuffix,
  applyStayFilters,
  type StaySearchParams,
} from "@/lib/stay-filters";

async function amenityIdsForSlugs(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("amenities")
    .select("id, slug")
    .in("slug", slugs);
  return (data ?? []).map((a) => a.id);
}

/** Exact count of stays matching a (draft) filter set. */
export async function countStays(params: StaySearchParams): Promise<number> {
  const supabase = createClient();
  const amenityIds = await amenityIdsForSlugs((params.amenities ?? []).slice(0, 10));
  let q = supabase
    .from("properties")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select(("id" + amenitySelectSuffix(amenityIds.length)) as any, {
      count: "exact",
      head: true,
    });
  q = applyStayFilters(q, params, amenityIds);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Sample of nightly prices for the histogram (scoped to destination/guests
 * only, so the distribution stays stable while other filters change).
 */
export async function fetchPriceSample(
  where: string | undefined,
  guests: number | undefined,
): Promise<number[]> {
  const supabase = createClient();
  let q = supabase.from("properties").select("price").limit(2000);
  q = applyStayFilters(q, { where, guests }, []);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? [])
    .map((r) => Number(r.price))
    .filter((p) => Number.isFinite(p) && p > 0);
}
