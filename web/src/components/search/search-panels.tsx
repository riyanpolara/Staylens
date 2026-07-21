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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type {
  DestinationSuggestion,
  GuestCounts,
  SearchState,
} from "@/components/search/search-types";

/* ------------------------------------------------------------------ *
 *  Where — suggested destinations (mirrors the video's list panel)
 * ------------------------------------------------------------------ */

const SUGGESTION_ICONS = [Navigation, Landmark, Mountain, Palmtree, Building2, MapPin];
const SUGGESTION_TINTS = [
  "bg-primary-fixed/60 text-on-primary-fixed-variant",
  "bg-surface-container-high text-primary",
  "bg-tertiary-container/40 text-tertiary",
  "bg-primary-fixed/40 text-primary",
  "bg-surface-container-highest text-on-surface-variant",
  "bg-primary-container/20 text-primary-container",
];

export function WherePanel({
  suggestions,
  query,
  onPick,
}: {
  suggestions: DestinationSuggestion[];
  query: string;
  onPick: (label: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? suggestions.filter((s) => s.label.toLowerCase().includes(q))
    : suggestions;

  return (
    <div className="w-[400px] max-h-[420px] overflow-y-auto scroll-hide p-6">
      <p className="text-xs font-semibold text-on-surface-variant mb-4">
        Suggested destinations
      </p>
      <ul role="listbox" aria-label="Suggested destinations">
        {filtered.map((s, i) => {
          const Icon = SUGGESTION_ICONS[i % SUGGESTION_ICONS.length];
          return (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onPick(s.label)}
                className="w-full flex items-center gap-4 rounded-2xl px-3 py-3 hover:bg-surface-container-low transition-colors text-left"
              >
                <span
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    SUGGESTION_TINTS[i % SUGGESTION_TINTS.length],
                  )}
                >
                  <Icon aria-hidden className="size-5" strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block font-semibold text-on-surface">{s.label}</span>
                  <span className="block text-sm text-on-surface-variant">{s.sub}</span>
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-3 py-3 text-on-surface-variant text-sm">
            No matching destinations
          </li>
        )}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  When — Dates / Flexible toggle + dual-month calendar
 * ------------------------------------------------------------------ */

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_FMT = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

function monthMatrix(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const cells: (Date | null)[] = Array(first.getDay()).fill(null);
  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  return cells;
}

function sameDay(a: Date | null, b: Date | null) {
  return !!a && !!b && a.toDateString() === b.toDateString();
}

function Month({
  year,
  month,
  checkIn,
  checkOut,
  onPick,
}: {
  year: number;
  month: number;
  checkIn: Date | null;
  checkOut: Date | null;
  onPick: (d: Date) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cells = monthMatrix(year, month);

  return (
    <div className="w-[280px]">
      <p className="text-center font-semibold mb-4">
        {MONTH_FMT.format(new Date(year, month, 1))}
      </p>
      <div className="grid grid-cols-7 text-center text-xs text-on-surface-variant mb-2">
        {DAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <span key={`e${i}`} />;
          const past = date < today;
          const isStart = sameDay(date, checkIn);
          const isEnd = sameDay(date, checkOut);
          const inRange =
            checkIn && checkOut && date > checkIn && date < checkOut;
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={past}
              onClick={() => onPick(date)}
              aria-label={date.toDateString()}
              aria-pressed={isStart || isEnd}
              className={cn(
                "h-10 w-10 mx-auto flex items-center justify-center rounded-full text-sm transition-colors",
                past && "text-outline-variant cursor-default",
                !past && !isStart && !isEnd && "hover:border hover:border-on-surface/60",
                inRange && "bg-surface-container rounded-none w-full",
                (isStart || isEnd) && "cta-gradient text-white font-semibold",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WhenPanel({
  state,
  onChange,
}: {
  state: SearchState;
  onChange: (next: Partial<SearchState>) => void;
}) {
  const now = new Date();
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState<"dates" | "flexible">("dates");

  const m0 = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const m1 = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);

  function pick(date: Date) {
    if (!state.checkIn || (state.checkIn && state.checkOut)) {
      onChange({ checkIn: date, checkOut: null });
    } else if (date <= state.checkIn) {
      onChange({ checkIn: date, checkOut: null });
    } else {
      onChange({ checkOut: date });
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-center mb-6">
        <div className="bg-surface-container rounded-full p-1 flex" role="tablist">
          {(["dates", "flexible"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-semibold capitalize transition-colors",
                tab === t
                  ? "bg-surface-container-lowest shadow-tinted text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "dates" ? (
        <div className="relative flex gap-12">
          <button
            type="button"
            aria-label="Previous month"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            className="absolute -left-2 top-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container disabled:opacity-30 transition-colors"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setOffset((o) => o + 1)}
            className="absolute -right-2 top-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
          <Month
            year={m0.getFullYear()}
            month={m0.getMonth()}
            checkIn={state.checkIn}
            checkOut={state.checkOut}
            onPick={pick}
          />
          <Month
            year={m1.getFullYear()}
            month={m1.getMonth()}
            checkIn={state.checkIn}
            checkOut={state.checkOut}
            onPick={pick}
          />
        </div>
      ) : (
        <div className="flex gap-3 justify-center py-10 w-[640px]">
          {["A weekend", "A week", "A month"].map((label) => (
            <button
              key={label}
              type="button"
              className="px-5 py-3 rounded-full border border-outline-variant/50 font-semibold text-sm hover:border-on-surface transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Who — guest steppers (Adults / Children / Infants / Pets)
 * ------------------------------------------------------------------ */

const GUEST_ROWS: { key: keyof GuestCounts; label: string; sub: string }[] = [
  { key: "adults", label: "Adults", sub: "Ages 13 or above" },
  { key: "children", label: "Children", sub: "Ages 2–12" },
  { key: "infants", label: "Infants", sub: "Under 2" },
  { key: "pets", label: "Pets", sub: "Bringing a service animal?" },
];

export function WhoPanel({
  guests,
  onChange,
}: {
  guests: GuestCounts;
  onChange: (next: GuestCounts) => void;
}) {
  function bump(key: keyof GuestCounts, delta: number) {
    const next = { ...guests, [key]: Math.max(0, guests[key] + delta) };
    // picking children/infants/pets implies at least one adult
    if (key !== "adults" && delta > 0 && next.adults === 0) next.adults = 1;
    onChange(next);
  }

  return (
    <div className="w-[400px] p-8">
      {GUEST_ROWS.map((row, i) => (
        <div
          key={row.key}
          className={cn(
            "flex items-center justify-between py-5",
            i < GUEST_ROWS.length - 1 && "border-b border-outline-variant/30",
          )}
        >
          <div>
            <p className="font-semibold text-on-surface">{row.label}</p>
            <p
              className={cn(
                "text-sm text-on-surface-variant",
                row.key === "pets" && "underline",
              )}
            >
              {row.sub}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={`Decrease ${row.label}`}
              disabled={guests[row.key] === 0}
              onClick={() => bump(row.key, -1)}
              className="w-8 h-8 rounded-full border border-outline-variant/60 flex items-center justify-center text-on-surface-variant hover:border-on-surface hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus aria-hidden className="size-4" />
            </button>
            <span className="w-6 text-center tabular-nums" aria-live="polite">
              {guests[row.key]}
            </span>
            <button
              type="button"
              aria-label={`Increase ${row.label}`}
              onClick={() => bump(row.key, 1)}
              className="w-8 h-8 rounded-full border border-outline-variant/60 flex items-center justify-center text-on-surface-variant hover:border-on-surface hover:text-on-surface transition-colors"
            >
              <Plus aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
