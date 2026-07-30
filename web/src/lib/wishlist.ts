import "server-only";
import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

/**
 * Wishlist reads.
 *
 * Backed by the existing `favorites` table, which already has a unique
 * (user_id, property_id) index and RLS restricting select/insert/delete to the
 * owner — so a duplicate save is impossible and one guest cannot read another's
 * list even if a query forgot to filter.
 */

export type WishlistStay = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  image: string | null;
  price: number;
  rating: number;
  reviewsCount: number;
  savedAt: string;
};

/** Property ids the signed-in guest has saved. Empty set when signed out. */
export async function getWishlistIds(): Promise<Set<string>> {
  noStore(); // per-user and changes on click — must never be cached across users
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from("favorites")
    .select("property_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("[wishlist] id read failed:", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.property_id));
}

type FavoriteRow = {
  property_id: string;
  created_at: string;
  properties: {
    name: string | null;
    city: string | null;
    country: string | null;
    price: number | null;
    review_scores_rating: number | null;
    number_of_reviews: number | null;
    property_images: { url: string | null }[] | null;
  } | null;
};

/** The saved properties themselves, newest save first. */
export async function getWishlist(): Promise<WishlistStay[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select(
      `property_id, created_at,
       properties ( name, city, country, price, review_scores_rating,
                    number_of_reviews, property_images ( url ) )`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[wishlist] read failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as FavoriteRow[])
    // A saved property that has since been delisted would otherwise render as
    // an untitled, priceless card.
    .filter((r) => r.properties)
    .map((r) => ({
      id: r.property_id,
      name: r.properties!.name ?? "This stay",
      city: r.properties!.city,
      country: r.properties!.country,
      image: r.properties!.property_images?.[0]?.url ?? null,
      price: r.properties!.price ?? 0,
      // Stored 0-100; the cards expect 0-5, same conversion as lib/queries.
      rating:
        r.properties!.review_scores_rating === null
          ? 0
          : Math.round((r.properties!.review_scores_rating / 20) * 10) / 10,
      reviewsCount: r.properties!.number_of_reviews ?? 0,
      savedAt: r.created_at,
    }));
}
