"use client";

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Landmark,
  MapPin,
  Minus,
  Mountain,
  Navigation,
  Palmtree,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  DAY_LABELS,
  MONTH_FMT,
  addMonths,
  monthMatrix,
  sameDay,
  startOfToday,
} from "@/lib/calendar";
import {
  formatGuests,
  formatWhen,
  type DestinationSuggestion,
  type GuestCounts,
  type SearchState,
} from "@/components/search/search-types";

const SUGGESTION_ICONS = [Navigation, Landmark, Mountain, Palmtree, Building2, MapPin];
const SUGGESTION_TINTS = [
  "bg-primary-fixed/60 text-on-primary-fixed-variant",
  "bg-surface-container-high text-primary",
  "bg-tertiary-container/40 text-tertiary",
  "bg-primary-fixed/40 text-primary",
  "bg-surface-container-highest text-on-surface-variant",
  "bg-primary-container/20 text-primary-container",
];

const GUEST_ROWS: { key: keyof GuestCounts; label: string; sub: string }[] = [
  { key: "adults", label: "Adults", sub: "Ages 13 or above" },
  { key: "children", label: "Children", sub: "Ages 2–12" },
  { key: "infants", label: "Infants", sub: "Under 2" },
  { key: "pets", label: "Pets", sub: "Bringing a service animal?" },
];

type Section = "where" | "when" | "who";

/**
 * Full-screen mobile search sheet (Airbnb pattern): expandable Where / When /
 * Who cards, single-month range calendar, guest steppers, Clear all + Search.
 * State lives in SiteHeader — this sheet edits the same SearchState the
 * desktop bar uses, so the two stay in sync.
 */
export function MobileSearchSheet({
  open,
  suggestions,
  state,
  onChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  suggestions: DestinationSuggestion[];
  state: SearchState;
  onChange: (next: Partial<SearchState>) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const [section, setSection] = useState<Section>("where");
  const [mounted, setMounted] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => setMounted(true), []);

  // lock page scroll while the sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setSection(state.where ? "when" : "where");
    return () => {
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  const q = state.where.trim().toLowerCase();
  const filtered = q
    ? suggestions.filter((s) => s.label.toLowerCase().includes(q))
    : suggestions;

  function pickDate(date: Date) {
    if (!state.checkIn || (state.checkIn && state.checkOut) || date <= state.checkIn) {
      onChange({ checkIn: date, checkOut: null });
    } else {
      onChange({ checkOut: date });
      setSection("who"); // range complete → advance, like Airbnb
    }
  }

  function bump(key: keyof GuestCounts, delta: number) {
    const next = { ...state.guests, [key]: Math.max(0, state.guests[key] + delta) };
    if (key !== "adults" && delta > 0 && next.adults === 0) next.adults = 1;
    onChange({ guests: next });
  }

  const base = addMonths(startOfToday(), monthOffset);
  const cells = monthMatrix(base.getFullYear(), base.getMonth());
  const today = startOfToday();

  const collapsedRow = (target: Section, label: string, value: string) => (
    <button
      type="button"
      onClick={() => setSection(target)}
      className="w-full flex items-center justify-between bg-surface-container-lowest rounded-2xl px-5 py-4 shadow-tinted text-left"
    >
      <span className="text-sm font-semibold text-on-surface-variant">{label}</span>
      <span className="text-sm font-bold text-on-surface">{value}</span>
    </button>
  );

  const sheet = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search stays"
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[80] md:hidden bg-surface-container-low flex flex-col",
        "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
        open
          ? "visible opacity-100 translate-y-0 pointer-events-auto"
          : "invisible opacity-0 translate-y-8 pointer-events-none",
      )}
    >
      {/* top bar */}
      <div className="shrink-0 flex items-center justify-center relative px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <button
          type="button"
          aria-label="Close search"
          onClick={onClose}
          className="absolute left-4 w-9 h-9 rounded-full bg-surface-container-lowest shadow-tinted flex items-center justify-center"
        >
          <X aria-hidden className="size-4" />
        </button>
        <span className="text-sm font-bold text-on-surface py-2">Stays</span>
      </div>

      {/* sections */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* ---- WHERE ---- */}
        {section === "where" ? (
          <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-tinted-lg">
            <h2 className="font-display text-2xl font-bold text-on-surface mb-4">Where?</h2>
            <div className="flex items-center gap-3 border border-outline-variant rounded-xl px-4 h-13 py-3 mb-4 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <Search aria-hidden className="size-5 text-on-surface shrink-0" strokeWidth={2.2} />
              <input
                value={state.where}
                onChange={(e) => onChange({ where: e.target.value })}
                placeholder="Search destinations"
                aria-label="Search destinations"
                className="flex-1 min-w-0 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/70"
              />
              {state.where && (
                <button
                  type="button"
                  aria-label="Clear destination"
                  onClick={() => onChange({ where: "" })}
                  className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center shrink-0"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs font-semibold text-on-surface-variant mb-2">
              Suggested destinations
            </p>
            <ul className="max-h-[40vh] overflow-y-auto scroll-hide" role="listbox" aria-label="Suggested destinations">
              {filtered.map((s, i) => {
                const Icon = SUGGESTION_ICONS[i % SUGGESTION_ICONS.length];
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => {
                        onChange({ where: s.label });
                        setSection("when");
                      }}
                      className="w-full flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-surface-container-low transition-colors text-left"
                    >
                      <span
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                          SUGGESTION_TINTS[i % SUGGESTION_TINTS.length],
                        )}
                      >
                        <Icon aria-hidden className="size-5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-on-surface text-sm">{s.label}</span>
                        <span className="block text-xs text-on-surface-variant">{s.sub}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-2 py-3 text-on-surface-variant text-sm">
                  No matching destinations — search anyway to use AI search
                </li>
              )}
            </ul>
          </div>
        ) : (
          collapsedRow("where", "Where", state.where || "I'm flexible")
        )}

        {/* ---- WHEN ---- */}
        {section === "when" ? (
          <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-tinted-lg">
            <h2 className="font-display text-2xl font-bold text-on-surface mb-4">When?</h2>
            <div className="relative">
              <button
                type="button"
                aria-label="Previous month"
                disabled={monthOffset === 0}
                onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
                className="absolute left-0 -top-1 w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container disabled:opacity-30 transition-colors"
              >
                <ChevronLeft aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setMonthOffset((o) => o + 1)}
                className="absolute right-0 -top-1 w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
              >
                <ChevronRight aria-hidden className="size-4" />
              </button>
              <p className="text-center font-semibold mb-4">{MONTH_FMT.format(base)}</p>
              <div className="grid grid-cols-7 text-center text-xs text-on-surface-variant mb-2">
                {DAY_LABELS.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((date, i) => {
                  if (!date) return <span key={`e${i}`} />;
                  const past = date < today;
                  const isStart = sameDay(date, state.checkIn);
                  const isEnd = sameDay(date, state.checkOut);
                  const inRange =
                    state.checkIn && state.checkOut && date > state.checkIn && date < state.checkOut;
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      disabled={past}
                      onClick={() => pickDate(date)}
                      aria-label={date.toDateString()}
                      aria-pressed={isStart || isEnd}
                      className={cn(
                        "h-11 w-full flex items-center justify-center text-sm rounded-full transition-colors",
                        past && "text-outline-variant cursor-default",
                        inRange && "bg-primary-fixed/40 rounded-none",
                        (isStart || isEnd) && "cta-gradient text-white font-semibold",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          collapsedRow("when", "When", formatWhen(state, "Add dates"))
        )}

        {/* ---- WHO ---- */}
        {section === "who" ? (
          <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-tinted-lg">
            <h2 className="font-display text-2xl font-bold text-on-surface mb-2">Who?</h2>
            {GUEST_ROWS.map((row, i) => (
              <div
                key={row.key}
                className={cn(
                  "flex items-center justify-between py-4",
                  i < GUEST_ROWS.length - 1 && "border-b border-outline-variant/30",
                )}
              >
                <div>
                  <p className="font-semibold text-on-surface">{row.label}</p>
                  <p className={cn("text-sm text-on-surface-variant", row.key === "pets" && "underline")}>
                    {row.sub}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={`Decrease ${row.label}`}
                    disabled={state.guests[row.key] === 0}
                    onClick={() => bump(row.key, -1)}
                    className="w-9 h-9 rounded-full border border-outline-variant/60 flex items-center justify-center text-on-surface-variant disabled:opacity-30 transition-colors"
                  >
                    <Minus aria-hidden className="size-4" />
                  </button>
                  <span className="w-6 text-center tabular-nums" aria-live="polite">
                    {state.guests[row.key]}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase ${row.label}`}
                    onClick={() => bump(row.key, 1)}
                    className="w-9 h-9 rounded-full border border-outline-variant/60 flex items-center justify-center text-on-surface-variant transition-colors"
                  >
                    <Plus aria-hidden className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          collapsedRow("who", "Who", formatGuests(state, "Add guests"))
        )}
      </div>

      {/* footer */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-surface-container-lowest border-t border-outline-variant/30">
        <button
          type="button"
          onClick={() =>
            onChange({
              where: "",
              checkIn: null,
              checkOut: null,
              guests: { adults: 0, children: 0, infants: 0, pets: 0 },
            })
          }
          className="font-bold text-on-surface underline underline-offset-4"
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onSubmit();
          }}
          className="cta-gradient text-white font-bold px-7 py-3.5 rounded-xl flex items-center gap-2 active:scale-95 transition-transform"
        >
          <Search aria-hidden className="size-4" strokeWidth={2.6} />
          Search
        </button>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
