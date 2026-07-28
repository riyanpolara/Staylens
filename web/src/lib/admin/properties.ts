import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PropertyStatus } from "@/lib/admin/types";
import {
  PROPERTY_PAGE_SIZE,
  type AdminPropertyRow,
  type PropertyQuery,
} from "@/lib/admin/property-query";

/**
 * Read side of the admin Properties screen.
 *
 * Both reads go through admin-only `SECURITY DEFINER` RPCs
 * (`supabase/migrations/0015_property_moderation.sql`) rather than PostgREST
 * selects: one round trip returns the page, the row total and the joined
 * host/cover-image, so ~6.5k listings never reach the client just to be counted
 * or paginated. The RPCs re-check `is_admin()` themselves, so the layout gate is
 * not the only thing standing between a caller and the data.
 */

/** Reads never throw — the page renders an inline error card with a retry so
 *  the toolbar stays usable and the admin can change filters instead. */
export type Result<T> = { ok: true; data: T } | { ok: false; message: string };

export type PropertiesPage = {
  rows: AdminPropertyRow[];
  total: number;
  page: number;
  pageCount: number;
};

function failure(error: { message: string; code?: string }): string {
  // 42501 is the RPC's own "not an admin" guard.
  if (error.code === "42501") return "You do not have permission to view these listings.";
  return error.message || "Could not reach the database.";
}

export async function fetchProperties(query: PropertyQuery): Promise<Result<PropertiesPage>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_properties_list", {
    p_search: query.q || undefined,
    p_status: query.status === "all" ? undefined : query.status,
    p_type: query.type === "all" ? undefined : query.type,
    p_featured: query.featured === "all" ? undefined : query.featured === "yes",
    p_sort: query.sort,
    p_dir: query.dir,
    p_page: query.page,
    p_page_size: PROPERTY_PAGE_SIZE,
  });

  if (error) {
    console.error("[admin/properties] list failed:", error);
    return { ok: false, message: failure(error) };
  }

  const payload = data as unknown as {
    rows: AdminPropertyRow[];
    total: number;
  } | null;

  if (!payload) return { ok: false, message: "The listings service returned nothing." };

  const total = payload.total ?? 0;
  return {
    ok: true,
    data: {
      rows: payload.rows ?? [],
      total,
      page: query.page,
      pageCount: Math.max(1, Math.ceil(total / PROPERTY_PAGE_SIZE)),
    },
  };
}

export type AdminPropertyDetail = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  house_rules: string | null;
  type: string;
  property_type: string | null;
  room_type: string | null;
  status: PropertyStatus;
  is_featured: boolean;
  moderation_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  city: string | null;
  country: string | null;
  street: string | null;
  latitude: number | null;
  longitude: number | null;
  price_per_night: number;
  currency: string;
  cleaning_fee: number | null;
  security_deposit: number | null;
  minimum_nights: number | null;
  maximum_nights: number | null;
  accommodates: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  cancellation_policy: string | null;
  listing_url: string | null;
  created_at: string;
  updated_at: string;
  rating_avg: number | null;
  review_count: number;
  booking_count: number;
  host: {
    id: string;
    name: string;
    picture_url: string | null;
    is_superhost: boolean;
    identity_verified: boolean;
    response_rate: number | null;
    listings_count: number | null;
    location: string | null;
  } | null;
  images: { url: string; caption: string | null }[];
  amenities: string[];
  recent_reviews: { id: string; reviewer: string | null; date: string | null; comments: string | null }[];
};

/** Resolves to `null` when the id matches no listing (the page 404s). */
export async function fetchPropertyDetail(
  id: string,
): Promise<Result<AdminPropertyDetail | null>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_property_detail", { p_id: id });

  if (error) {
    console.error("[admin/properties] detail failed:", error);
    return { ok: false, message: failure(error) };
  }
  return { ok: true, data: (data as unknown as AdminPropertyDetail | null) ?? null };
}
