import Image from "next/image";
import Link from "next/link";
import type { Trip } from "@/lib/profile";

/**
 * Travel History — the guest's real bookings.
 *
 * The cover is the most recent stay's own photo rather than a stock world map,
 * so a guest with one trip sees that trip. With no trips there is nothing
 * truthful to show, so the card says so instead of rendering an empty frame.
 */
export function TravelHistoryCard({ trips }: { trips: Trip[] }) {
  const taken = trips.filter((t) => t.status !== "cancelled");
  const countries = new Set(
    taken.map((t) => t.country).filter((c): c is string => !!c),
  ).size;
  const latest = taken[0] ?? null;
  const latestPlace = latest
    ? [latest.city, latest.country].filter(Boolean).join(", ") || latest.propertyName
    : null;

  return (
    <section className="bg-white rounded-[20px] p-6 md:p-10 shadow-tinted border border-outline-variant/10 overflow-hidden">
      <h3 className="font-display text-2xl font-semibold text-on-surface mb-6">
        Travel History
      </h3>

      {latest ? (
        <div className="relative h-48 rounded-xl overflow-hidden mb-4 bg-surface-container">
          {latest.image && (
            <Image
              src={latest.image}
              alt={latestPlace ?? latest.propertyName}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <p className="text-2xl font-bold">
              {countries} {countries === 1 ? "Country" : "Countries"}
            </p>
            <p className="text-sm opacity-90">Last trip: {latestPlace}</p>
          </div>
        </div>
      ) : (
        <div className="h-48 rounded-xl mb-4 bg-surface-container flex flex-col items-center justify-center text-center px-6">
          <p className="text-sm font-semibold text-on-surface">No trips yet.</p>
          <p className="text-sm text-on-surface-variant mt-1">
            Start exploring and book your first stay.
          </p>
        </div>
      )}

      <Link
        href={trips.length ? "/trips" : "/search"}
        className="block w-full py-2 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold text-center hover:opacity-90 transition-all"
      >
        {trips.length ? "View Travel Log" : "Explore stays"}
      </Link>
    </section>
  );
}
