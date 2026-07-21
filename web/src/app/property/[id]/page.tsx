import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/search/site-header";
import { FALLBACK_SUGGESTIONS } from "@/components/search/search-types";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertySubNav } from "@/components/property/property-subnav";
import { Highlights } from "@/components/property/highlights";
import { DescriptionBlock } from "@/components/property/description-block";
import { AmenitiesSection } from "@/components/property/amenities-section";
import { AvailabilityCalendar } from "@/components/property/availability-calendar";
import { ReviewsSection } from "@/components/property/reviews-section";
import { WhereMap } from "@/components/property/where-map";
import { HostSection } from "@/components/property/host-section";
import { BookingProvider } from "@/components/property/booking-context";
import { BookingSidebar } from "@/components/property/booking-sidebar";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getPropertyDetail, getSearchSuggestionList } from "@/lib/queries";
import { parseISODate } from "@/lib/calendar";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getPropertyDetail(id).catch(() => null);
  if (!p) return { title: "Stay not found" };
  return {
    title: p.name,
    description:
      p.summary ?? p.description?.slice(0, 155) ?? `A stay in ${p.city ?? "a beautiful place"} on Staylens.`,
    openGraph: {
      title: p.name,
      images: p.images[0] ? [{ url: p.images[0].url }] : undefined,
    },
  };
}

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  let property;
  try {
    property = await getPropertyDetail(id);
  } catch (err) {
    console.error("[property] getPropertyDetail failed:", err);
    property = null;
  }
  if (!property) notFound();

  const descriptionText =
    property.description ?? property.summary ?? property.neighborhoodOverview ?? "";
  const kind = property.propertyType?.toLowerCase() ?? "place";

  let suggestions = FALLBACK_SUGGESTIONS;
  try {
    suggestions = await getSearchSuggestionList();
  } catch {
    /* fallback stays */
  }

  // pre-fill the booking card from the dates/guests carried over from search
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" && v.length ? v : undefined;
  const posInt = (v: string | string[] | undefined) => {
    const n = Number(one(v));
    return Number.isInteger(n) && n > 0 ? n : undefined;
  };
  const checkIn = parseISODate(one(sp.in));
  const checkOut = parseISODate(one(sp.out));
  const initialBooking = {
    checkIn,
    // ignore an invalid range (checkout must come after check-in)
    checkOut: checkIn && checkOut && checkOut > checkIn ? checkOut : null,
    guests: {
      adults: posInt(sp.adults),
      children: posInt(sp.children),
      infants: posInt(sp.infants),
    },
  };

  return (
    <>
      {/* compact Airbnb search pill in the header (image 3) */}
      <SiteHeader suggestions={suggestions} defaultCollapsed />
      <main id="main-content" className="pt-[144px] md:pt-[88px] pb-16 md:pb-24">
        {/* hero gallery */}
        <section
          id="photos"
          className="scroll-mt-[150px] max-w-[1280px] mx-auto px-4 md:px-16 mt-2 md:mt-6"
        >
          <PropertyGallery
            images={property.images}
            rating={property.rating}
            isRareFind={property.rating >= 4.95}
          />
        </section>

        <BookingProvider
          config={{
            price: property.price,
            cleaningFee: property.cleaningFee,
            minNights: property.minimumNights ?? 1,
            maxNights: property.maximumNights ?? 365,
            maxGuests: property.accommodates ?? 16,
          }}
          initial={initialBooking}
        >
          {/* sticky section nav — appears on scroll, gains price+Reserve
              once the booking card leaves the viewport (images 4 → 5) */}
          <PropertySubNav propertyId={property.id} />
          <section className="max-w-[1280px] mx-auto px-4 md:px-16 mt-6 md:mt-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
              {/* left column */}
              <div className="lg:col-span-8 min-w-0 flex flex-col gap-10">
                <div>
                  <h1 className="font-display text-[32px] leading-10 md:text-5xl md:leading-[56px] font-bold text-primary mb-3">
                    {property.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-on-surface-variant font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin aria-hidden className="size-5 text-primary" />
                      {[property.area, property.country].filter(Boolean).join(", ")}
                    </span>
                    {property.host?.isSuperhost && (
                      <>
                        <span className="hidden md:inline text-outline-variant">•</span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck aria-hidden className="size-5 text-primary" />
                          Superhost
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <Highlights property={property} />
                <hr className="border-outline-variant/30" />

                {descriptionText && (
                  <>
                    <DescriptionBlock
                      title={`About this ${kind}`}
                      text={descriptionText}
                    />
                    <hr className="border-outline-variant/30" />
                  </>
                )}

                <div id="amenities" className="scroll-mt-[150px]">
                  <AmenitiesSection amenities={property.amenities} />
                </div>
                <hr className="border-outline-variant/30" />

                <AvailabilityCalendar />
                <hr className="border-outline-variant/30" />

                <div id="reviews" className="scroll-mt-[150px]">
                  <ReviewsSection property={property} />
                </div>
                <hr className="border-outline-variant/30" />

                <div id="location" className="scroll-mt-[150px]">
                  <WhereMap
                    id={property.id}
                    name={property.name}
                    area={property.area}
                    country={property.country}
                    latitude={property.latitude}
                    longitude={property.longitude}
                  />
                </div>
              </div>

              {/* right column: booking */}
              <div className="lg:col-span-4">
                <BookingSidebar rating={property.rating} propertyId={property.id} />
              </div>
            </div>
          </section>
        </BookingProvider>

        {property.host && (
          <section className="max-w-[1280px] mx-auto px-4 md:px-16 mt-16">
            <HostSection host={property.host} propertyId={property.id} />
          </section>
        )}
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
