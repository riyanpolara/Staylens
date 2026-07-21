import { PropertyCard } from "@/components/explore/property-card";
import { CategoryChips } from "@/components/explore/category-chips";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { getExploreStays, type ExploreStay } from "@/lib/queries";
import { STAYS } from "@/lib/placeholder-data";

/** Design placeholders reshaped as a fallback if the DB is unreachable. */
const FALLBACK: ExploreStay[] = STAYS.map((s) => ({
  id: s.id,
  name: s.name,
  location: s.location,
  price: s.price,
  rating: s.rating,
  reviews: 0,
  images: [{ url: s.image, alt: s.imageAlt }],
  isSuperhost: false,
  isRareFind: s.rating >= 4.95,
  latitude: null,
  longitude: null,
}));

/**
 * "Curated Collections" bento grid — async server component. Fetches the
 * top-rated stays from Supabase; layout is identical to the Stitch design
 * (first card featured at 2 columns, two standard cards).
 */
export async function PropertyGrid() {
  let stays: ExploreStay[];
  try {
    stays = await getExploreStays(3);
    if (stays.length === 0) stays = FALLBACK;
  } catch (err) {
    console.error("[explore] getExploreStays failed, using fallback:", err);
    stays = FALLBACK;
  }

  return (
    <section
      aria-labelledby="collections-heading"
      className="py-16 max-w-[1280px] mx-auto px-4 md:px-16"
    >
      <SectionHeading
        headingId="collections-heading"
        title="Curated Collections"
        subtitle="Exceptional homes, vetted for comfort and design."
        actionLabel="View all stays"
      />
      <div className="mb-8">
        <CategoryChips />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stays.map((stay, i) => (
          <Reveal
            key={stay.id}
            index={i}
            className={i === 0 ? "lg:col-span-2" : undefined}
          >
            <PropertyCard stay={stay} featured={i === 0} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
