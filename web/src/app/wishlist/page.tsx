import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { PropertyCard } from "@/components/explore/property-card";
import { ProfileTopNav } from "@/components/profile/profile-top-nav";
import { ProfileFooter } from "@/components/profile/profile-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";
import { getWishlist } from "@/lib/wishlist";
import { getProfile } from "@/lib/profile";
import type { ExploreStay } from "@/lib/queries";

/**
 * Saved stays.
 *
 * The proxy requires a session here, so this never renders for a signed-out
 * visitor. Cards are the same PropertyCard used on search and explore — a
 * second card design would drift from the first.
 */

export const metadata: Metadata = {
  title: "Your wishlist",
  robots: { index: false },
};

export default async function WishlistPage() {
  const [profile, stays] = await Promise.all([getProfile(), getWishlist()]);

  // Seeding the provider with what the server already knows means the hearts
  // render filled immediately instead of flashing empty for a moment.
  const savedIds = stays.map((s) => s.id);

  return (
    <WishlistProvider initialIds={savedIds}>
      <ProfileTopNav
        avatarUrl={profile?.avatarUrl ?? ""}
        name={profile?.fullName ?? ""}
        email={profile?.email ?? ""}
      />
      <main id="main-content" className="max-w-[1280px] mx-auto px-4 md:px-16 py-16">
        <h1 className="font-display text-3xl font-semibold text-on-surface mb-2">
          Your wishlist
        </h1>
        <p className="text-on-surface-variant mb-10">
          {stays.length
            ? `${stays.length} saved ${stays.length === 1 ? "stay" : "stays"}`
            : "Stays you save will appear here."}
        </p>

        {stays.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {stays.map((s) => {
              // PropertyCard speaks ExploreStay; map the saved row onto it
              // rather than building a second card for this one page.
              const stay: ExploreStay = {
                id: s.id,
                name: s.name,
                location: [s.city, s.country].filter(Boolean).join(", "),
                price: s.price,
                rating: s.rating,
                reviews: s.reviewsCount,
                images: s.image ? [{ url: s.image, alt: s.name }] : [],
                isSuperhost: false,
                isRareFind: s.rating >= 4.95,
                latitude: null,
                longitude: null,
              };

              return <PropertyCard key={s.id} stay={stay} variant="result" />;
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[20px] p-12 text-center shadow-tinted border border-outline-variant/10">
            <Heart
              aria-hidden
              className="size-10 mx-auto text-destructive fill-destructive/20"
              strokeWidth={1.8}
            />
            <p className="font-display text-xl font-semibold text-on-surface mt-4">
              Your wishlist is empty.
            </p>
            <p className="text-sm text-on-surface-variant mt-1">
              Save your favourite stays to quickly find them later.
            </p>
            <Link
              href="/search"
              className="inline-block mt-6 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
            >
              Explore properties
            </Link>
          </div>
        )}
      </main>
      <ProfileFooter />
      <MobileNav active="Wishlist" />
    </WishlistProvider>
  );
}
