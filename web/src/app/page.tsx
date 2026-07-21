import type { Metadata } from "next";
import { Suspense } from "react";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { SiteHeader } from "@/components/search/site-header";
import { FALLBACK_SUGGESTIONS, type DestinationSuggestion } from "@/components/search/search-types";
import { getExploreStays, getSearchSuggestionList } from "@/lib/queries";
import { MobileNav } from "@/components/layout/mobile-nav";
import { HeroCarousel } from "@/components/landing/hero-carousel";
import { CollectionsGrid } from "@/components/landing/collections-grid";
import { AiSearchSection } from "@/components/landing/ai-search-section";
import { RecommendedCarousel } from "@/components/landing/recommended-carousel";
import { WorldMapSection } from "@/components/landing/world-map-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { StatsSection } from "@/components/landing/stats-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { PremiumCta } from "@/components/landing/premium-cta";
import { PremiumFooter } from "@/components/landing/premium-footer";

/* Premium landing typography (design: Cormorant Garamond + Manrope) */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

/** Catalog data is near-static — prerender and refresh hourly. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Staylens | The World's Finest Stays, Found For You",
  description:
    "A new lens on luxury travel — extraordinary homes across 150 countries, matched to how you want to feel by StayLens Intelligence.",
};

/** Live city suggestions for the search "Where" panel (graceful fallback). */
async function getSearchSuggestions(): Promise<DestinationSuggestion[]> {
  try {
    return await getSearchSuggestionList();
  } catch (err) {
    console.error("[landing] search suggestions failed, using fallback:", err);
    return FALLBACK_SUGGESTIONS;
  }
}

/** Live "AI-recommended" stays — top-rated, heavily reviewed (fallback: none). */
async function LiveRecommended() {
  let stays: Awaited<ReturnType<typeof getExploreStays>> = [];
  try {
    stays = await getExploreStays(8);
  } catch (err) {
    console.error("[landing] recommended stays failed:", err);
  }
  return <RecommendedCarousel stays={stays} />;
}

/**
 * StayLens Premium landing page (Claude Design handoff). The floating
 * morphing search header (SiteHeader) is UNCHANGED — the design's "locked
 * header" is this exact component.
 */
export default async function LandingPage() {
  const suggestions = await getSearchSuggestions();
  return (
    <div
      className={`${cormorant.variable} ${manrope.variable}`}
      style={{ fontFamily: "var(--font-manrope)", background: "#f8f6f1", color: "#16241d" }}
    >
      {/* overlay: header floats transparently over the hero carousel at top */}
      <SiteHeader suggestions={suggestions} overlay />
      <main id="main-content">
        <HeroCarousel />
        <CollectionsGrid />
        <AiSearchSection />
        <Suspense fallback={<div className="min-h-[560px]" />}>
          <LiveRecommended />
        </Suspense>
        <WorldMapSection />
        <TestimonialsSection />
        <StatsSection />
        <FeaturesSection />
        <PremiumCta />
      </main>
      <PremiumFooter />
      <MobileNav />
    </div>
  );
}
