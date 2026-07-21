import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import type { PropertyDetail } from "@/lib/queries";

/** Host profile block (Stitch footer host area). */
export function HostSection({
  host,
  propertyId,
}: {
  host: NonNullable<PropertyDetail["host"]>;
  propertyId: string;
}) {
  const name = host.name ?? "Your host";
  return (
    <section
      aria-labelledby="host-heading"
      className="border-t border-outline-variant/30 pt-12"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full border-2 border-primary p-1 shrink-0">
              {host.pictureUrl ? (
                <Image
                  src={host.pictureUrl}
                  alt={name}
                  width={80}
                  height={80}
                  unoptimized={host.pictureUrl.includes("muscache")}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-primary-fixed/60 flex items-center justify-center text-on-primary-fixed-variant text-2xl font-bold">
                  {name.slice(0, 1)}
                </div>
              )}
            </div>
            <div>
              <h3 id="host-heading" className="font-display text-xl font-semibold text-primary">
                Hosted by {name}
              </h3>
              {host.isSuperhost && (
                <p className="text-sm text-on-surface-variant">Superhost</p>
              )}
            </div>
          </div>
          {host.identityVerified && (
            <div className="flex items-center gap-2">
              <BadgeCheck aria-hidden className="size-5 text-primary-container" />
              <span className="text-sm font-semibold">Identity verified</span>
            </div>
          )}
          {host.isSuperhost && (
            <div className="flex items-center gap-2">
              <ShieldCheck aria-hidden className="size-5 text-primary-container" />
              <span className="text-sm font-semibold">Superhost</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {host.about && (
            <p className="text-on-surface-variant leading-relaxed line-clamp-6">{host.about}</p>
          )}
          {host.listingsCount != null && host.listingsCount > 0 && (
            <p className="text-sm text-on-surface-variant">
              {host.listingsCount.toLocaleString()} listing
              {host.listingsCount === 1 ? "" : "s"} on Staylens
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 items-start md:items-end">
          <Link
            href={`/property/${propertyId}/contact`}
            className="inline-flex justify-center px-8 py-3 rounded-xl border-[1.5px] border-primary text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-300 w-full md:w-auto"
          >
            Message host
          </Link>
          <p className="text-sm text-on-surface-variant text-left md:text-right">
            {host.responseRate != null && <>Response rate: {host.responseRate}%<br /></>}
            {host.responseTime && <>Responds {host.responseTime}</>}
          </p>
        </div>
      </div>
    </section>
  );
}
