"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Wishlist writes.
 *
 * The user id always comes from the session, never from the request. A
 * client-supplied id would let anyone edit someone else's wishlist, and RLS
 * would reject it anyway — but the check belongs here too, so the failure is a
 * clear error rather than a silently empty result.
 */

export type ToggleResult =
  | { ok: true; saved: boolean }
  | { ok: false; reason: "unauthenticated" }
  | { ok: false; reason: "error"; error: string };

/**
 * Adds or removes a property. Returns the resulting state so the client can
 * reconcile its optimistic update against what actually happened.
 */
export async function toggleWishlist(propertyId: string): Promise<ToggleResult> {
  if (!propertyId) return { ok: false, reason: "error", error: "Missing property." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: existing, error: readErr } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (readErr) {
    console.error("[wishlist] lookup failed:", readErr.message);
    return { ok: false, reason: "error", error: "Couldn't update your wishlist." };
  }

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("property_id", propertyId);
    if (error) {
      console.error("[wishlist] remove failed:", error.message);
      return { ok: false, reason: "error", error: "Couldn't remove that stay." };
    }
    revalidateWishlistViews();
    return { ok: true, saved: false };
  }

  // upsert, not insert: two fast clicks would otherwise trip the unique index
  // and surface as an error even though the intent (be saved) succeeded.
  const { error } = await supabase
    .from("favorites")
    .upsert(
      { user_id: user.id, property_id: propertyId },
      { onConflict: "user_id,property_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[wishlist] add failed:", error.message);
    return { ok: false, reason: "error", error: "Couldn't save that stay." };
  }

  revalidateWishlistViews();
  return { ok: true, saved: true };
}

/** Every server-rendered surface that shows saved state or a wishlist count. */
function revalidateWishlistViews() {
  revalidatePath("/wishlist");
  revalidatePath("/profile/edit");
}
