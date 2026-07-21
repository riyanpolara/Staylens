import { GoogleMap } from "@/components/maps/google-map";

/** "Where you'll be" — real Google Map centered on the stay with a home pin. */
export function WhereMap({
  id,
  name,
  area,
  country,
  latitude,
  longitude,
}: {
  id: string;
  name: string;
  area: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  const label = [area, country].filter(Boolean).join(", ");
  return (
    <section aria-labelledby="where-heading">
      <h2 id="where-heading" className="font-display text-xl md:text-2xl font-semibold text-primary mb-6">
        Where you&apos;ll be
      </h2>
      <div className="relative w-full h-[360px] md:h-[400px] rounded-[20px] overflow-hidden shadow-tinted border border-outline-variant/20">
        <GoogleMap
          variant="home"
          pins={[{ id, name, latitude, longitude }]}
        />
      </div>
      {label && <p className="mt-4 text-on-surface-variant">{label}</p>}
    </section>
  );
}
