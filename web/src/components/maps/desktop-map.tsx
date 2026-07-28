"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { GoogleMapPin } from "@/components/maps/google-map";

/**
 * Code-split map bundle — only fetched when a map is actually shown.
 */
const GoogleMap = dynamic(
  () => import("@/components/maps/google-map").then((m) => m.GoogleMap),
  { ssr: false },
);

/**
 * Desktop-only map mount.
 *
 * The split-view map lives in an `aside` that is *visually* hidden below the
 * `lg` breakpoint (`hidden lg:block`) — but CSS visibility doesn't stop React
 * from mounting it, so every phone and tablet visitor was downloading and
 * executing the whole Google Maps JavaScript API (plus tile requests) for a map
 * they can never see. Gating the mount on a real media query keeps the desktop
 * experience byte-for-byte identical while removing that cost on small screens.
 */
export function DesktopMap({
  pins,
  variant = "pins",
  className,
}: {
  pins: GoogleMapPin[];
  variant?: "pins" | "home";
  className?: string;
}) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!isDesktop) return null;
  return <GoogleMap pins={pins} variant={variant} className={className} />;
}
