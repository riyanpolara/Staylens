import Image from "next/image";
import { BadgeCheck, MessageCircle, Star } from "lucide-react";
import type { PropertyDetail } from "@/lib/queries";

/** Host intro card (Stitch "Meet Elena" section). */
export function ContactHostProfile({ host }: { host: NonNullable<PropertyDetail["host"]> }) {
  const name = host.name ?? "Your host";
  const chips: { icon: typeof Star; label: string }[] = [];
  if (host.responseTime) chips.push({ icon: MessageCircle, label: `Usually responds ${host.responseTime}` });
  if (host.responseRate != null) chips.push({ icon: Star, label: `${host.responseRate}% response rate` });

  return (
    <section className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 rounded-xl bg-surface-container-low border border-outline-variant/20 shadow-tinted">
      <div className="relative shrink-0">
        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-surface-container-lowest shadow-md">
          {host.pictureUrl ? (
            <Image
              src={host.pictureUrl}
              alt={name}
              width={80}
              height={80}
              unoptimized={host.pictureUrl.includes("muscache")}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="w-full h-full bg-primary-fixed/60 text-on-primary-fixed-variant text-2xl font-bold flex items-center justify-center">
              {name.slice(0, 1)}
            </span>
          )}
        </div>
        {host.identityVerified && (
          <span className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1 border-2 border-surface-container-lowest">
            <BadgeCheck aria-hidden className="size-4" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-2xl font-semibold text-on-surface">Meet {name}</h2>
        <p className="text-on-surface-variant mb-3">
          {host.isSuperhost ? "Superhost" : "Host"}
          {host.listingsCount != null && host.listingsCount > 0
            ? ` · ${host.listingsCount} listing${host.listingsCount === 1 ? "" : "s"}`
            : ""}
        </p>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-highest text-xs font-semibold text-primary"
              >
                <c.icon aria-hidden className="size-3.5" />
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
