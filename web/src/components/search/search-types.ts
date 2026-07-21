export type SearchField = "where" | "when" | "who";

export type GuestCounts = {
  adults: number;
  children: number;
  infants: number;
  pets: number;
};

export type SearchState = {
  where: string;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: GuestCounts;
};

export type DestinationSuggestion = {
  id: string;
  label: string;
  sub: string;
};

export const EMPTY_SEARCH: SearchState = {
  where: "",
  checkIn: null,
  checkOut: null,
  guests: { adults: 0, children: 0, infants: 0, pets: 0 },
};

const fmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

export function formatWhen(s: SearchState, fallback: string): string {
  if (s.checkIn && s.checkOut) return `${fmt.format(s.checkIn)} – ${fmt.format(s.checkOut)}`;
  if (s.checkIn) return fmt.format(s.checkIn);
  return fallback;
}

export function formatGuests(s: SearchState, fallback: string): string {
  const total = s.guests.adults + s.guests.children;
  if (total === 0) return fallback;
  let label = `${total} guest${total > 1 ? "s" : ""}`;
  if (s.guests.infants > 0) label += `, ${s.guests.infants} infant${s.guests.infants > 1 ? "s" : ""}`;
  if (s.guests.pets > 0) label += `, ${s.guests.pets} pet${s.guests.pets > 1 ? "s" : ""}`;
  return label;
}

export const FALLBACK_SUGGESTIONS: DestinationSuggestion[] = [
  { id: "nearby", label: "Nearby", sub: "Find what's around you" },
  { id: "hawaii", label: "Hawaii", sub: "Stays in United States" },
  { id: "bangkok", label: "Bangkok", sub: "Stays in Thailand" },
  { id: "barcelona", label: "Barcelona", sub: "Stays in Spain" },
  { id: "berlin", label: "Berlin", sub: "Stays in Germany" },
  { id: "austin", label: "Austin", sub: "Stays in United States" },
];
