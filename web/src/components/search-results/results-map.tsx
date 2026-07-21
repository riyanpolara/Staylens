import { MapPin } from "lucide-react";
import type { MapPinInput } from "@/lib/map-pins";
import { GoogleMap } from "@/components/maps/google-map";

/**
 * Desktop split-view map panel: always visible on the right, sticky under the
 * header. Real Google Map with StayLens price-pill markers; clicking a pin
 * opens the property in a new tab.
 */
export function ResultsMap({
  pins,
  locationLabel,
  hrefQuery = "",
}: {
  pins: MapPinInput[];
  locationLabel?: string;
  /** booking query (dates/guests) carried onto the popup's property link */
  hrefQuery?: string;
}) {
  const mapPins = pins.map((p) => ({ ...p, href: `/property/${p.id}${hrefQuery}` }));
  const hasPins = mapPins.some((p) => p.latitude != null && p.longitude != null);

  return (
    <aside
      aria-label="Map of results"
      className="hidden lg:block sticky top-[152px] h-[calc(100vh-176px)] rounded-3xl overflow-hidden border border-outline-variant/30 shadow-tinted"
    >
      <GoogleMap pins={mapPins} variant="pins" />

      {locationLabel && (
        <span className="absolute bottom-4 left-4 z-10 bg-surface-container-lowest shadow-tinted rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1.5">
          <MapPin aria-hidden className="size-3.5 text-primary" />
          {locationLabel}
        </span>
      )}

      {!hasPins && (
        <p className="absolute inset-0 flex items-center justify-center text-on-surface-variant text-sm">
          No mappable results on this page
        </p>
      )}
    </aside>
  );
}
