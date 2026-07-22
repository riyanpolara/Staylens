"use client";

import { List, Map as MapIcon, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MapPinInput } from "@/lib/map-pins";
import { GoogleMap } from "@/components/maps/google-map";

/**
 * Floating "Show map" button (mobile) + a full-screen Google Map overlay with
 * price-pill markers. The map mounts on first open (saves the Maps API call
 * for users who never open it) and stays mounted after that.
 */
export function MapToggle({
  pins,
  hrefQuery = "",
}: {
  pins: MapPinInput[];
  /** booking query (dates/guests) carried onto the popup's property link */
  hrefQuery?: string;
}) {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const mapPins = pins.map((p) => ({ ...p, href: `/property/${p.id}${hrefQuery}` }));
  const hasPins = mapPins.some((p) => p.latitude != null && p.longitude != null);

  function toggle() {
    setOpen((o) => !o);
    setEverOpened(true);
  }

  return (
    <>
      <div className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 z-50">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          {open ? (
            <List aria-hidden className="size-5" />
          ) : (
            <MapIcon aria-hidden className="size-5" />
          )}
          {open ? "List" : "Map"}
        </button>
      </div>

      {/* always mounted; state-bound classes animate via CSS transition */}
      <div
        role="dialog"
        aria-label="Map of results"
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 top-20 z-40 bg-surface-container-low overflow-hidden",
          "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
          open
            ? "visible opacity-100 translate-y-0 pointer-events-auto"
            : "invisible opacity-0 translate-y-12 pointer-events-none",
        )}
      >
        {everOpened && <GoogleMap pins={mapPins} variant="pins" />}

        <button
          type="button"
          aria-label="Close map"
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-surface-container-lowest shadow-tinted flex items-center justify-center hover:text-primary transition-colors"
        >
          <X aria-hidden className="size-5" />
        </button>

        {!hasPins && (
          <p className="absolute inset-0 flex items-center justify-center text-on-surface-variant">
            No mappable results on this page
          </p>
        )}
      </div>
    </>
  );
}
