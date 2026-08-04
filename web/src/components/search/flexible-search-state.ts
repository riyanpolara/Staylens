/**
 * Flexible-search state: vocabulary, month generation, and date resolution.
 *
 * Kept free of React and of server imports so the panels, the submit handler and
 * `lib/search-query` can all share one definition of what a flexible search is.
 *
 * This does NOT introduce a second search state. `SearchState.flexible` holds
 * these fields, so the "when" tab, the duration and the chosen months travel
 * with `where` and `guests` through the same object the exact-date path already
 * uses — including across panel open/close, which the old local `tab` state lost.
 *
 * KEY IDEA: flexible is a *way of choosing dates*, not a parallel search mode.
 * At submit it resolves to a concrete `in`/`out` pair, so /search prices stays
 * and the property page inherits dates with no changes to either. The flexible
 * intent rides along in the URL as well, purely so the search bar can say
 * "Weekend in Oct" and the panel can reopen in the state you left it.
 */

/* ── Vocabulary ──────────────────────────────────────────────────────── */

export type SearchMode = "dates" | "flexible";

export const DURATIONS = ["weekend", "week", "month"] as const;
export type FlexibleDuration = (typeof DURATIONS)[number];

/**
 * Nights each duration books.
 *
 * Concrete numbers, not ranges: the results page prices a real stay ("₹4,844
 * for 2 nights"), so "2–3 nights" cannot be priced — something has to pick.
 *
 *   weekend  Friday to Sunday          2 nights
 *   week     the 1st to the 6th        5 nights
 *   month    the 1st to the 29th      28 nights
 */
export const DURATION_NIGHTS: Record<FlexibleDuration, number> = {
  weekend: 2,
  week: 5,
  month: 28,
};

export const DURATION_META: Record<
  FlexibleDuration,
  { label: string; hint: string }
> = {
  weekend: { label: "Weekend", hint: "2 nights" },
  week: { label: "Week", hint: "5 nights" },
  month: { label: "Month", hint: "28 nights" },
};

export const QUICK_OPTIONS = ["anytime", "next-month", "next-3", "next-6"] as const;
export type FlexibleQuickOption = (typeof QUICK_OPTIONS)[number];

export const QUICK_OPTION_LABEL: Record<FlexibleQuickOption, string> = {
  anytime: "Anytime",
  "next-month": "Next month",
  "next-3": "Next 3 months",
  "next-6": "Next 6 months",
};

export type FlexibleSearch = {
  /** Which tab of the "When" panel is showing. */
  mode: SearchMode;
  duration: FlexibleDuration;
  /** Selected months as "YYYY-MM", ascending. */
  months: string[];
  /** Set when a preset picked the months; cleared once they are hand-edited. */
  quickOption: FlexibleQuickOption | null;
};

/** Week is the default duration; no months are chosen up front. */
export const EMPTY_FLEXIBLE: FlexibleSearch = {
  mode: "dates",
  duration: "week",
  months: [],
  quickOption: null,
};

/* ── Months ──────────────────────────────────────────────────────────── */

export type FlexibleMonth = {
  /** "YYYY-MM" — the value that travels in the URL. */
  key: string;
  label: string;
  year: number;
};

const MONTH_LONG = new Intl.DateTimeFormat("en", { month: "long" });
const MONTH_SHORT = new Intl.DateTimeFormat("en", { month: "short" });

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): Date | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : null;
}

/**
 * Twelve months starting from NEXT month.
 *
 * Not the current one: a flexible search is planning ahead, and by the time
 * someone is browsing "a weekend in August" in late July, most of July has no
 * bookable weekend left. Rolls automatically — once August ends the strip starts
 * at September. Generated from today, never hardcoded.
 */
export function generateMonths(count = 12, from: Date = new Date()): FlexibleMonth[] {
  const start = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    return { key: monthKey(d), label: MONTH_LONG.format(d), year: d.getFullYear() };
  });
}

/**
 * Which months a preset selects.
 *
 * "Anytime" deliberately selects none: an empty month list already means "no
 * month constraint", and listing twelve months in the URL says the same thing
 * far worse.
 */
export function monthsForQuickOption(
  option: FlexibleQuickOption,
  from: Date = new Date(),
): string[] {
  const all = generateMonths(12, from);
  switch (option) {
    case "anytime":
      return [];
    case "next-month":
      return all.slice(0, 1).map((m) => m.key);
    case "next-3":
      return all.slice(0, 3).map((m) => m.key);
    case "next-6":
      return all.slice(0, 6).map((m) => m.key);
  }
}

/** Adds or removes a month, keeping the list ascending. */
export function toggleMonth(months: string[], key: string): string[] {
  return months.includes(key)
    ? months.filter((m) => m !== key)
    : [...months, key].sort();
}

/* ── Resolving to real dates ─────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Turns "a weekend in October" into an actual stay.
 *
 * Deterministic, not random: the same search must produce the same dates on a
 * reload, and a results page whose prices shuffle every refresh is unusable.
 *
 *   weekend  the month's first Friday → Sunday   (Oct 2026: 2–4 Oct)
 *   week     the 1st → the 6th                   (Oct 2026: 1–6 Oct)
 *   month    the 1st → the 29th                  (Oct 2026: 1–29 Oct)
 *
 * Anything landing in the past is pushed to the next month, so a stale URL
 * cannot ask to book yesterday.
 */
export function resolveFlexibleDates(
  duration: FlexibleDuration,
  month: string,
  today: Date = new Date(),
): { checkIn: string; checkOut: string } | null {
  const base = parseMonthKey(month);
  if (!base) return null;

  const nights = DURATION_NIGHTS[duration];
  let start: Date;

  if (duration === "weekend") {
    // First Friday of the month.
    start = new Date(base.getFullYear(), base.getMonth(), 1);
    while (start.getDay() !== 5) start.setDate(start.getDate() + 1);
  } else {
    start = new Date(base.getFullYear(), base.getMonth(), 1);
  }

  // Never propose a stay that has already begun.
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (start < midnight) {
    if (duration === "weekend") {
      // Next Friday from today.
      start = new Date(midnight);
      do {
        start.setDate(start.getDate() + 1);
      } while (start.getDay() !== 5);
    } else {
      start = new Date(midnight);
      start.setDate(start.getDate() + 1);
    }
  }

  const end = new Date(start);
  end.setDate(end.getDate() + nights);
  return { checkIn: toISO(start), checkOut: toISO(end) };
}

/** The first month of the selection, or null when none is chosen. */
export function primaryMonth(f: FlexibleSearch): string | null {
  return f.months.length ? f.months[0] : null;
}

/**
 * The dates a flexible search should actually run against.
 *
 * With no month chosen ("anytime") it uses the first month of the strip, so a
 * search always has something concrete to price rather than returning the whole
 * catalogue with no dates.
 */
export function flexibleDates(
  f: FlexibleSearch,
  today: Date = new Date(),
): { checkIn: string; checkOut: string } | null {
  const month = primaryMonth(f) ?? generateMonths(1, today)[0]?.key;
  return month ? resolveFlexibleDates(f.duration, month, today) : null;
}

/* ── Summary ─────────────────────────────────────────────────────────── */

/**
 * The line the collapsed search bar shows: "Weekend in Oct", "Week in Oct",
 * "Month in Oct" — or "Any weekend" before a month is picked.
 */
export function flexibleSummary(f: FlexibleSearch): string {
  const noun = DURATION_META[f.duration].label;
  if (f.months.length === 0) return `Any ${noun.toLowerCase()}`;

  const labels = f.months.map((k) => {
    const d = parseMonthKey(k);
    return d ? MONTH_SHORT.format(d) : k;
  });
  if (labels.length === 1) return `${noun} in ${labels[0]}`;
  if (labels.length === 2) return `${noun} in ${labels[0]} or ${labels[1]}`;
  return `${noun} · ${labels.length} months`;
}

/* ── URL ─────────────────────────────────────────────────────────────── */

/**
 * Writes the flexible intent AND the resolved dates.
 *
 * Both, deliberately. `in`/`out` are what /search, pricing and the property page
 * already understand, so they need no knowledge of flexible search at all; the
 * `flexible`/`duration`/`months` params exist only so the search bar can label
 * itself and the panel can reopen where you left it.
 */
export function buildFlexibleQuery(f: FlexibleSearch, qs: URLSearchParams): void {
  if (f.mode !== "flexible") return;

  qs.set("flexible", "1");
  qs.set("duration", f.duration);
  if (f.months.length) qs.set("months", f.months.join(","));
  if (f.quickOption) qs.set("when", f.quickOption);

  const dates = flexibleDates(f);
  if (dates) {
    qs.set("in", dates.checkIn);
    qs.set("out", dates.checkOut);
  }
}

/** Reads flexible state back out of the URL. Unknown values fall back. */
export function parseFlexibleQuery(get: (k: string) => string | null): FlexibleSearch {
  if (get("flexible") !== "1") return EMPTY_FLEXIBLE;

  const duration = get("duration");
  const quick = get("when");
  const months = (get("months") ?? "")
    .split(",")
    .map((s) => s.trim())
    // Guards against a hand-edited URL reaching the query as a bad month.
    .filter((s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s))
    .sort();

  return {
    mode: "flexible",
    duration: (DURATIONS as readonly string[]).includes(duration ?? "")
      ? (duration as FlexibleDuration)
      : "week",
    months,
    quickOption: (QUICK_OPTIONS as readonly string[]).includes(quick ?? "")
      ? (quick as FlexibleQuickOption)
      : null,
  };
}
