import { Bath, Bed, Users, type LucideIcon } from "lucide-react";
import { amenityIcon } from "@/components/shared/amenity-icon";
import type { PropertyDetail } from "@/lib/queries";

/** The Stitch "highlights" tile row — capacity facts + two notable amenities. */
export function Highlights({ property }: { property: PropertyDetail }) {
  const tiles: { icon: LucideIcon; label: string }[] = [];

  if (property.bedrooms != null)
    tiles.push({ icon: Bed, label: `${property.bedrooms} Bedroom${property.bedrooms === 1 ? "" : "s"}` });
  if (property.bathrooms != null)
    tiles.push({ icon: Bath, label: `${property.bathrooms} Bath${property.bathrooms === 1 ? "" : "s"}` });
  if (property.accommodates != null)
    tiles.push({ icon: Users, label: `${property.accommodates} Guest${property.accommodates === 1 ? "" : "s"}` });

  // fill remaining tiles with headline amenities (pool/wifi/etc.)
  const priority = ["pool", "wifi", "air-conditioning", "kitchen", "free-parking-on-premises", "hot-tub"];
  for (const slug of priority) {
    if (tiles.length >= 4) break;
    const a = property.amenities.find((am) => am.slug === slug);
    if (a) tiles.push({ icon: amenityIcon(a.slug), label: a.name });
  }
  while (tiles.length < 4 && tiles.length < property.amenities.length + 3) {
    const a = property.amenities[tiles.length - 3];
    if (!a) break;
    tiles.push({ icon: amenityIcon(a.slug), label: a.name });
  }

  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {tiles.slice(0, 4).map((t, i) => (
        <div
          key={i}
          className="p-5 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col items-center text-center"
        >
          <t.icon aria-hidden className="size-7 text-primary-container mb-2" strokeWidth={1.6} />
          <span className="text-sm font-semibold text-primary line-clamp-2">{t.label}</span>
        </div>
      ))}
    </div>
  );
}
