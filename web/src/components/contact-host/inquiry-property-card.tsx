import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

/** "Your inquiry property" hero card at the bottom (Stitch). Links to detail. */
export function InquiryPropertyCard({
  id,
  name,
  image,
  location,
  price,
}: {
  id: string;
  name: string;
  image?: string;
  location: string;
  price: number;
}) {
  return (
    <Link
      href={`/property/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block h-[240px] rounded-[20px] overflow-hidden shadow-tinted group border border-outline-variant/20 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {image ? (
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 800px) 100vw, 800px"
          unoptimized={image.includes("muscache")}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-surface-container" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 p-6 w-full flex justify-between items-end gap-4">
        <div className="text-white min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
            Your inquiry property
          </p>
          <h4 className="font-display text-2xl font-semibold line-clamp-1">{name}</h4>
          <p className="flex items-center gap-1 text-sm mt-1">
            <MapPin aria-hidden className="size-4" />
            {location}
          </p>
        </div>
        <div className="glass-header bg-white/20 px-4 py-2 rounded-lg border border-white/20 shrink-0">
          <p className="text-white font-bold">
            ${price.toLocaleString()}
            <span className="font-normal opacity-80"> / night</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
