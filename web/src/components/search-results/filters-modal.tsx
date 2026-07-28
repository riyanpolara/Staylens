"use client";

import {
  AirVent,
  Award,
  ChevronDown,
  CookingPot,
  Gem,
  Heater,
  KeyRound,
  Laptop,
  Minus,
  PawPrint,
  Plus,
  Refrigerator,
  Shirt,
  Tv,
  WashingMachine,
  Waves,
  Wifi,
  Wind,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import { countStays, fetchPriceSample } from "@/lib/search-client";
import type { StaySearchParams } from "@/lib/stay-filters";

/* ------------------------------------------------------------------ */

type Draft = {
  type: string | null; // room_type ("any" = null)
  priceMin: number;
  priceMax: number; // === cap ⇒ open-ended
  bedrooms: number; // 0 = Any
  bathrooms: number; // 0 = Any
  amenities: Set<string>;
  fav: boolean;
  luxe: boolean;
  ptype: string | null;
};

const TYPE_TABS = [
  { value: null, label: "Any type" },
  { value: "Private room", label: "Room" },
  { value: "Entire home/apt", label: "Entire home" },
];

const AMENITY_GROUPS: {
  group: string;
  items: { slug: string; label: string; icon: typeof Wifi }[];
}[] = [
  {
    group: "Popular",
    items: [
      { slug: "wifi", label: "Wifi", icon: Wifi },
      { slug: "air-conditioning", label: "Air conditioning", icon: AirVent },
      { slug: "pool", label: "Pool", icon: Waves },
      { slug: "iron", label: "Iron", icon: Shirt },
      { slug: "washer", label: "Washing machine", icon: WashingMachine },
      { slug: "hair-dryer", label: "Hairdryer", icon: Wind },
    ],
  },
  {
    group: "Essentials",
    items: [
      { slug: "kitchen", label: "Kitchen", icon: CookingPot },
      { slug: "heating", label: "Heating", icon: Heater },
      { slug: "tv", label: "TV", icon: Tv },
      { slug: "laptop-friendly-workspace", label: "Dedicated workspace", icon: Laptop },
      { slug: "refrigerator", label: "Refrigerator", icon: Refrigerator },
    ],
  },
];

const BOOKING_OPTIONS = [
  { slug: "self-check-in", label: "Self check-in", icon: KeyRound },
  { slug: "pets-allowed", label: "Allows pets", icon: PawPrint },
];

const PROPERTY_TYPES = ["House", "Apartment", "Condominium", "Villa", "Guesthouse", "Hotel"];

const PRICE_CAP_FALLBACK = 1000;
const BUCKETS = 40;

function draftFromParams(sp: URLSearchParams, cap: number): Draft {
  const [pMin, pMax] = (sp.get("price") ?? "-").split("-");
  return {
    type: sp.get("type"),
    priceMin: pMin ? Number(pMin) : 0,
    priceMax: pMax ? Number(pMax) : cap,
    bedrooms: Number(sp.get("beds") ?? 0) || 0,
    bathrooms: Number(sp.get("bath") ?? 0) || 0,
    amenities: new Set((sp.get("am") ?? "").split(",").filter(Boolean)),
    fav: sp.get("fav") === "1",
    luxe: sp.get("luxe") === "1",
    ptype: sp.get("ptype"),
  };
}

function draftToParams(d: Draft, cap: number): StaySearchParams {
  return {
    type: d.type ?? undefined,
    price:
      d.priceMin > 0 || d.priceMax < cap
        ? `${d.priceMin > 0 ? d.priceMin : ""}-${d.priceMax < cap ? d.priceMax : ""}`
        : undefined,
    beds: d.bedrooms || undefined,
    bath: d.bathrooms || undefined,
    amenities: [...d.amenities],
    fav: d.fav || undefined,
    luxe: d.luxe || undefined,
    ptype: d.ptype ?? undefined,
  };
}

/**
 * Full Filters dialog (video pass 2): type tabs, price histogram with a
 * dual-thumb range, room steppers, grouped amenity pills, booking options,
 * standout stays, collapsible property type — with Clear all and a live
 * "Show N places" count. Draft state applies to the URL on submit.
 */
export function FiltersModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);

  const where = searchParams.get("where") ?? undefined;
  const guests =
    (Number(searchParams.get("adults")) || 0) +
    (Number(searchParams.get("children")) || 0);

  const [prices, setPrices] = useState<number[]>([]);
  const cap = useMemo(() => {
    if (prices.length === 0) return PRICE_CAP_FALLBACK;
    const sorted = [...prices].sort((a, b) => a - b);
    return Math.max(100, Math.ceil(sorted[Math.floor(sorted.length * 0.95)] / 50) * 50);
  }, [prices]);

  const [draft, setDraft] = useState<Draft>(() =>
    draftFromParams(searchParams, PRICE_CAP_FALLBACK),
  );
  const [count, setCount] = useState<number | null>(null);
  const [ptypeOpen, setPtypeOpen] = useState(false);

  // load price sample once (destination-scoped)
  useEffect(() => {
    let alive = true;
    fetchPriceSample(where, guests || undefined)
      .then((p) => {
        if (!alive) return;
        setPrices(p);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [where, guests]);

  // re-clamp the draft max when the real cap arrives
  useEffect(() => {
    setDraft((d) => ({
      ...d,
      priceMax: d.priceMax >= PRICE_CAP_FALLBACK ? cap : Math.min(d.priceMax, cap),
    }));
  }, [cap]);

  // live count, debounced on draft changes
  useEffect(() => {
    const t = setTimeout(() => {
      countStays({ where, guests: guests || undefined, ...draftToParams(draft, cap) })
        .then(setCount)
        .catch(() => setCount(null));
    }, 300);
    return () => clearTimeout(t);
  }, [draft, where, guests, cap]);

  // scroll lock + escape
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const histogram = useMemo(() => {
    const bars = Array(BUCKETS).fill(0);
    for (const p of prices) {
      if (p > cap) continue; // outliers beyond the cap would spike the last bar
      const i = Math.min(BUCKETS - 1, Math.floor((p / cap) * BUCKETS));
      bars[i]++;
    }
    const max = Math.max(1, ...bars);
    return bars.map((b) => b / max);
  }, [prices, cap]);

  const apply = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    const p = draftToParams(draft, cap);
    const setOrDelete = (key: string, val: string | undefined) => {
      if (val) next.set(key, val);
      else next.delete(key);
    };
    setOrDelete("type", p.type);
    setOrDelete("price", p.price);
    setOrDelete("beds", p.beds ? String(p.beds) : undefined);
    setOrDelete("bath", p.bath ? String(p.bath) : undefined);
    setOrDelete("am", p.amenities?.length ? p.amenities.join(",") : undefined);
    setOrDelete("fav", p.fav ? "1" : undefined);
    setOrDelete("luxe", p.luxe ? "1" : undefined);
    setOrDelete("ptype", p.ptype);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    onClose();
  }, [draft, cap, searchParams, pathname, router, onClose]);

  function clearAll() {
    setDraft({
      type: null,
      priceMin: 0,
      priceMax: cap,
      bedrooms: 0,
      bathrooms: 0,
      amenities: new Set(),
      fav: false,
      luxe: false,
      ptype: null,
    });
  }

  const amenityPill = (slug: string, label: string, Icon: typeof Wifi) => {
    const active = draft.amenities.has(slug);
    return (
      <button
        key={slug}
        type="button"
        aria-pressed={active}
        onClick={() =>
          setDraft((d) => {
            const amenities = new Set(d.amenities);
            if (active) amenities.delete(slug);
            else amenities.add(slug);
            return { ...d, amenities };
          })
        }
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm transition-all",
          active
            ? "border-primary bg-primary-fixed/40 text-on-primary-fixed-variant font-semibold"
            : "border-outline-variant hover:border-on-surface",
        )}
      >
        <Icon aria-hidden className="size-4" strokeWidth={1.8} />
        {label}
      </button>
    );
  };

  const stepper = (
    label: string,
    value: number,
    set: (v: number) => void,
  ) => (
    <div className="flex items-center justify-between py-4">
      <span className="text-on-surface">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value === 0}
          onClick={() => set(Math.max(0, value - 1))}
          className="w-8 h-8 rounded-full border border-outline-variant/60 flex items-center justify-center hover:border-on-surface disabled:opacity-30 transition-colors"
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <span className="w-10 text-center text-sm">{value === 0 ? "Any" : `${value}+`}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => set(Math.min(8, value + 1))}
          className="w-8 h-8 rounded-full border border-outline-variant/60 flex items-center justify-center hover:border-on-surface transition-colors"
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );

  const minPct = (draft.priceMin / cap) * 100;
  const maxPct = (draft.priceMax / cap) * 100;

  // Portalled to <body>: the filter bar is a sticky z-40 stacking context,
  // which would otherwise pin this dialog BELOW the z-60 site header.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-on-surface/40 cursor-default"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.21, 0.65, 0.36, 1] }}
        className="relative bg-surface-container-lowest w-full max-w-[568px] max-h-[85vh] rounded-3xl shadow-tinted-lg flex flex-col overflow-hidden"
      >
        {/* header */}
        <div className="relative flex items-center justify-center h-14 border-b border-outline-variant/30 shrink-0">
          <h2 className="font-semibold">Filters</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        {/* scrollable body */}
        <div className="overflow-y-auto px-6 py-6 flex flex-col gap-8">
          {/* type of place — segmented tabs */}
          <div role="tablist" aria-label="Type of place" className="grid grid-cols-3 border border-outline-variant rounded-xl overflow-hidden">
            {TYPE_TABS.map((tab) => {
              const active = draft.type === tab.value;
              return (
                <button
                  key={tab.label}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, type: tab.value }))}
                  className={cn(
                    "py-3 text-sm font-semibold transition-colors border-r border-outline-variant last:border-r-0",
                    active
                      ? "bg-primary-fixed/40 text-on-primary-fixed-variant ring-1 ring-inset ring-primary rounded-xl"
                      : "hover:bg-surface-container-low",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* price range with histogram + dual slider */}
          <section aria-label="Price range">
            <h3 className="font-semibold text-lg">Price range</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Nightly price, in USD
            </p>
            <div className="px-2">
              <div className="relative h-16 flex items-end gap-[2px]" aria-hidden>
                {histogram.map((h, i) => {
                  const bucketStart = (i / BUCKETS) * cap;
                  const inRange =
                    bucketStart >= draft.priceMin && bucketStart <= draft.priceMax;
                  return (
                    <div
                      key={i}
                      style={{ height: `${Math.max(4, h * 100)}%` }}
                      className={cn(
                        "flex-1 rounded-t-sm transition-colors",
                        inRange ? "bg-primary-container" : "bg-outline-variant/40",
                      )}
                    />
                  );
                })}
              </div>
              {/* dual-thumb slider */}
              <div className="relative h-8 -mt-1">
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-0.5 bg-outline-variant/50 rounded" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-primary rounded"
                  style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={cap}
                  step={10}
                  value={draft.priceMin}
                  aria-label="Minimum price"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      priceMin: Math.min(Number(e.target.value), d.priceMax - 10),
                    }))
                  }
                  className="range-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
                />
                <input
                  type="range"
                  min={0}
                  max={cap}
                  step={10}
                  value={draft.priceMax}
                  aria-label="Maximum price"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      priceMax: Math.max(Number(e.target.value), d.priceMin + 10),
                    }))
                  }
                  className="range-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
                />
              </div>
              <div className="flex justify-between mt-3">
                <div className="border border-outline-variant rounded-full px-5 py-2 text-sm">
                  <span className="block text-[11px] text-on-surface-variant">Minimum</span>
                  {/* Displayed in INR; the slider value and the ?price= filter
                      stay in USD, which is what the database stores. */}
                  {formatPrice(draft.priceMin)}
                </div>
                <div className="border border-outline-variant rounded-full px-5 py-2 text-sm text-right">
                  <span className="block text-[11px] text-on-surface-variant">Maximum</span>
                  {formatPrice(draft.priceMax)}
                  {draft.priceMax >= cap ? "+" : ""}
                </div>
              </div>
            </div>
          </section>

          <hr className="border-outline-variant/30" />

          {/* rooms and beds */}
          <section aria-label="Rooms and beds">
            <h3 className="font-semibold text-lg mb-2">Rooms and beds</h3>
            {stepper("Bedrooms", draft.bedrooms, (v) =>
              setDraft((d) => ({ ...d, bedrooms: v })),
            )}
            {stepper("Bathrooms", draft.bathrooms, (v) =>
              setDraft((d) => ({ ...d, bathrooms: v })),
            )}
          </section>

          <hr className="border-outline-variant/30" />

          {/* amenities */}
          <section aria-label="Amenities">
            <h3 className="font-semibold text-lg mb-4">Amenities</h3>
            {AMENITY_GROUPS.map(({ group, items }) => (
              <div key={group} className="mb-5">
                <p className="text-sm font-semibold text-on-surface-variant mb-3">
                  {group}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((a) => amenityPill(a.slug, a.label, a.icon))}
                </div>
              </div>
            ))}
          </section>

          <hr className="border-outline-variant/30" />

          {/* booking options */}
          <section aria-label="Booking options">
            <h3 className="font-semibold text-lg mb-4">Booking options</h3>
            <div className="flex flex-wrap gap-2">
              {BOOKING_OPTIONS.map((a) => amenityPill(a.slug, a.label, a.icon))}
            </div>
          </section>

          <hr className="border-outline-variant/30" />

          {/* standout stays */}
          <section aria-label="Standout stays">
            <h3 className="font-semibold text-lg mb-4">Standout stays</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  key: "fav" as const,
                  icon: Award,
                  title: "Guest favourite",
                  sub: "The most loved homes on Staylens",
                },
                {
                  key: "luxe" as const,
                  icon: Gem,
                  title: "Luxe",
                  sub: "Luxury homes with elevated design",
                },
              ].map(({ key, icon: Icon, title, sub }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={draft[key]}
                  onClick={() => setDraft((d) => ({ ...d, [key]: !d[key] }))}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                    draft[key]
                      ? "border-primary bg-primary-fixed/30"
                      : "border-outline-variant hover:border-on-surface",
                  )}
                >
                  <Icon aria-hidden className="size-6 shrink-0 text-primary" strokeWidth={1.6} />
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-sm text-on-surface-variant">{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <hr className="border-outline-variant/30" />

          {/* property type (collapsible) */}
          <section aria-label="Property type" className="pb-2">
            <button
              type="button"
              aria-expanded={ptypeOpen}
              onClick={() => setPtypeOpen((o) => !o)}
              className="w-full flex items-center justify-between font-semibold text-lg"
            >
              Property type
              <ChevronDown
                aria-hidden
                className={cn("size-5 transition-transform", ptypeOpen && "rotate-180")}
              />
            </button>
            {ptypeOpen && (
              <div className="flex flex-wrap gap-2 mt-4">
                {PROPERTY_TYPES.map((pt) => {
                  const active = draft.ptype === pt;
                  return (
                    <button
                      key={pt}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setDraft((d) => ({ ...d, ptype: active ? null : pt }))
                      }
                      className={cn(
                        "px-4 py-2.5 rounded-full border text-sm transition-all",
                        active
                          ? "border-primary bg-primary-fixed/40 font-semibold text-on-primary-fixed-variant"
                          : "border-outline-variant hover:border-on-surface",
                      )}
                    >
                      {pt}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* sticky footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/30 shrink-0 bg-surface-container-lowest">
          <button
            type="button"
            onClick={clearAll}
            className="font-semibold underline underline-offset-4 hover:text-primary transition-colors"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={apply}
            className="cta-gradient text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all"
          >
            {count === null ? "Show places" : `Show ${count.toLocaleString()} places`}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
