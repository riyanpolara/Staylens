"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatPrice, formatPriceCompact } from "@/lib/currency";
import { MapSurface } from "@/components/shared/map-surface";

/* eslint-disable @typescript-eslint/no-explicit-any */

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

export type GoogleMapPin = {
  id: string;
  name: string;
  /** shown in the price pill; omit for the single "home" marker */
  price?: number | null;
  latitude: number | null;
  longitude: number | null;
  /** clicking the pin opens this in a new tab (e.g. /property/id) */
  href?: string;
  /* --- popup card fields --- */
  image?: string | null;
  location?: string | null;
  rating?: number | null;
  reviews?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
  priceLabel?: string;
};

/* ---- Maps JS API loader (one script per page, shared promise) ---------- */
let loaderPromise: Promise<any> | null = null;

function loadGoogleMaps(): Promise<any> {
  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google);
  if (!loaderPromise) {
    loaderPromise = new Promise((resolve, reject) => {
      w.__staylensMapsReady = () => resolve(w.google);
      const s = document.createElement("script");
      s.src =
        "https://maps.googleapis.com/maps/api/js" +
        `?key=${encodeURIComponent(KEY)}&v=weekly&libraries=marker` +
        "&loading=async&callback=__staylensMapsReady";
      s.async = true;
      s.onerror = () => {
        loaderPromise = null;
        reject(new Error("Google Maps failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return loaderPromise;
}

/* ---- marker DOM (matches the app's price-pill / home-pin design) ------- */
function pricePillEl(pin: GoogleMapPin): HTMLElement {
  const el = document.createElement("div");
  el.className =
    "gm-price-pill bg-surface-container-lowest border border-outline-variant/40 " +
    "shadow-tinted rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap " +
    "cursor-pointer transition-all hover:scale-110 hover:bg-primary hover:text-white";
  el.textContent = pin.price != null ? formatPriceCompact(pin.price) : pin.name;
  el.title = pin.name;
  return el;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/**
 * Popup card shown on the first click of a price pin (Airbnb-style): photo,
 * title + rating, location, beds/baths and the price. Clicking the card opens
 * the property.
 */
function popupCardEl(pin: GoogleMapPin): HTMLElement {
  const el = document.createElement("div");
  el.className = "gm-popup-card w-[260px] cursor-pointer";

  const beds = [
    pin.beds != null ? `${pin.beds} bed${pin.beds === 1 ? "" : "s"}` : null,
    pin.bathrooms != null
      ? `${pin.bathrooms} bathroom${pin.bathrooms === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const priceText =
    pin.priceLabel ??
    (pin.price != null ? `${formatPrice(pin.price)} / night` : "");

  el.innerHTML = `
    ${
      pin.image
        ? `<img src="${escapeHtml(pin.image)}" alt="" loading="lazy"
             class="w-full h-[150px] object-cover rounded-xl mb-2.5" />`
        : ""
    }
    <div class="flex items-start justify-between gap-2">
      <p class="font-semibold text-sm text-on-surface line-clamp-1">${escapeHtml(pin.name)}</p>
      ${
        pin.rating
          ? `<span class="flex items-center gap-1 text-sm shrink-0">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-on-surface"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
               <span class="font-semibold">${pin.rating.toFixed(2)}</span>
               ${pin.reviews ? `<span class="text-on-surface-variant">(${pin.reviews})</span>` : ""}
             </span>`
          : ""
      }
    </div>
    ${
      pin.location
        ? `<p class="text-xs text-on-surface-variant line-clamp-1 mt-0.5">${escapeHtml(pin.location)}</p>`
        : ""
    }
    ${beds ? `<p class="text-xs text-on-surface-variant mt-0.5">${beds}</p>` : ""}
    ${priceText ? `<p class="text-sm font-bold text-on-surface mt-1.5">${escapeHtml(priceText)}</p>` : ""}
  `;
  return el;
}

function homePinEl(name: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "flex flex-col items-center";
  wrap.innerHTML =
    '<div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-xl">' +
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' +
    "</div>" +
    '<div class="mt-2 bg-surface-container-lowest px-3 py-1 rounded-full shadow-tinted text-xs font-semibold text-primary whitespace-nowrap"></div>';
  (wrap.lastElementChild as HTMLElement).textContent = name;
  return wrap;
}

/**
 * Real Google Map (Maps JavaScript API) with StayLens-styled markers.
 * - `variant="pins"`: price pills, auto fit-bounds, click → open property.
 * - `variant="home"`: single pulsing home marker centered on the stay.
 * Falls back to the decorative MapSurface when no API key is configured or
 * the script fails (offline, quota, blocked).
 */
export function GoogleMap({
  pins,
  variant = "pins",
  className,
}: {
  pins: GoogleMapPin[];
  variant?: "pins" | "home";
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoRef = useRef<any>(null);
  /** id of the pin whose popup is open — a second click on it navigates */
  const openIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(KEY === "");

  const located = pins.filter((p) => p.latitude != null && p.longitude != null);
  const pinsKey = JSON.stringify(located.map((p) => [p.id, p.price, p.latitude, p.longitude]));

  useEffect(() => {
    if (KEY === "" || !containerRef.current || located.length === 0) return;
    let cancelled = false;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;

        if (!infoRef.current) {
          infoRef.current = new g.maps.InfoWindow({ maxWidth: 280 });
          infoRef.current.addListener("closeclick", () => {
            openIdRef.current = null;
          });
        }
        const info = infoRef.current;

        if (!mapRef.current) {
          mapRef.current = new g.maps.Map(containerRef.current, {
            mapId: MAP_ID,
            center: { lat: located[0].latitude!, lng: located[0].longitude! },
            zoom: variant === "home" ? 14 : 12,
            disableDefaultUI: false,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: variant === "pins",
            clickableIcons: false,
          });
          // clicking empty map dismisses the popup (attached once per map)
          mapRef.current.addListener("click", () => {
            info.close();
            openIdRef.current = null;
          });
        }
        const map = mapRef.current;

        // replace markers; any open popup belongs to the old set
        for (const m of markersRef.current) m.map = null;
        markersRef.current = [];
        info.close();
        openIdRef.current = null;

        const bounds = new g.maps.LatLngBounds();
        for (const pin of located) {
          const pos = { lat: pin.latitude!, lng: pin.longitude! };
          bounds.extend(pos);
          const marker = new g.maps.marker.AdvancedMarkerElement({
            map,
            position: pos,
            content: variant === "home" ? homePinEl(pin.name) : pricePillEl(pin),
            title: pin.name,
            zIndex: 1,
          });

          if (variant === "pins") {
            marker.addListener("click", () => {
              // second click on the already-open pin → open the property
              if (openIdRef.current === pin.id && pin.href) {
                window.open(pin.href, "_blank", "noopener,noreferrer");
                return;
              }
              const card = popupCardEl(pin);
              if (pin.href) {
                card.addEventListener("click", () => {
                  window.open(pin.href!, "_blank", "noopener,noreferrer");
                });
              }
              info.setContent(card);
              info.open({ map, anchor: marker });
              openIdRef.current = pin.id;
            });
          }
          markersRef.current.push(marker);
        }

        if (variant === "home" || located.length === 1) {
          map.setCenter({ lat: located[0].latitude!, lng: located[0].longitude! });
          map.setZoom(14);
        } else {
          map.fitBounds(bounds, 56);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinsKey, variant]);

  if (failed || located.length === 0) {
    return (
      <div className={cn("absolute inset-0", className)}>
        <MapSurface />
        {failed && KEY === "" && (
          <span className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface-container-lowest/90 shadow-tinted rounded-full px-4 py-1.5 text-xs font-semibold text-on-surface-variant">
            Map preview — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </span>
        )}
      </div>
    );
  }

  return <div ref={containerRef} className={cn("absolute inset-0", className)} />;
}
