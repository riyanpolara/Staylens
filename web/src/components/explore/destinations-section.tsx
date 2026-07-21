import { FeaturedDestinations } from "@/components/explore/featured-destinations";
import { getTopCityDestinations, type CityDestination } from "@/lib/queries";
import { DESTINATIONS } from "@/lib/placeholder-data";

/**
 * Server wrapper for "Where to next?" — fetches the top cities (by live
 * property count) and hands them to the presentational client component.
 */
export async function DestinationsSection() {
  let destinations: CityDestination[];
  try {
    destinations = await getTopCityDestinations(4);
    if (destinations.length === 0) throw new Error("no cities");
  } catch (err) {
    console.error("[explore] getTopCityDestinations failed, using fallback:", err);
    destinations = DESTINATIONS;
  }
  return <FeaturedDestinations destinations={destinations} />;
}
