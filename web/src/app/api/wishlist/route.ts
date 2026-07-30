import { NextResponse } from "next/server";
import { getWishlistIds } from "@/lib/wishlist";

/**
 * The signed-in guest's saved property ids.
 *
 * One request per page load feeds every heart on that page, which keeps the
 * pages themselves statically renderable — threading saved state through the
 * card props would force the whole landing grid to render per-request.
 *
 * Signed out returns an empty list rather than 401: not being signed in is a
 * normal state here, not an error.
 */
export async function GET() {
  const ids = await getWishlistIds();
  return NextResponse.json(
    { ids: [...ids] },
    // Private and never shared: this is one person's list.
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
