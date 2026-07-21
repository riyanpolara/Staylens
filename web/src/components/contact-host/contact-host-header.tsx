"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Slim Contact Host header: back button, title, host avatar (Stitch). */
export function ContactHostHeader({
  hostName,
  hostAvatar,
}: {
  hostName: string;
  hostAvatar?: string | null;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-50 glass-header bg-surface/80 border-b border-outline-variant/30">
      <div className="flex justify-between items-center w-full px-4 md:px-16 h-20 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-all active:scale-90"
          >
            <ArrowLeft aria-hidden className="size-5 text-primary" />
          </button>
          <h1 className="font-display text-xl md:text-2xl font-bold text-primary tracking-tight">
            Contact Host
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container">
          {hostAvatar ? (
            <Image
              src={hostAvatar}
              alt={hostName}
              width={40}
              height={40}
              unoptimized={hostAvatar.includes("muscache")}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="w-full h-full bg-primary-fixed/60 text-on-primary-fixed-variant font-bold flex items-center justify-center">
              {hostName.slice(0, 1)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
