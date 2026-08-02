import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in guest's profile, their real activity, and how complete it is.
 *
 * Everything here is scoped to `auth.uid()`. There is no demo fallback and no
 * unscoped read: an earlier version selected the first row in `profiles` with
 * no filter, which showed whichever account happened to come back first.
 *
 * Empty means empty. A guest who has not filled a field in gets a placeholder,
 * never a plausible-looking invention.
 */

export type ProfileLanguage = {
  id: string;
  name: string;
  level: string;
  verified: boolean;
};

export type ConnectedProvider = "facebook" | "google";

export type ConnectedAccount = {
  provider: ConnectedProvider;
  connected: boolean;
};

export type ProfilePrivacy = {
  publicProfile: boolean;
  showWishlists: boolean;
};

export type Profile = {
  id: string;
  fullName: string;
  legalName: string;
  location: string;
  avatarUrl: string;
  identityVerified: boolean;
  email: string;
  phone: string;
  emergencyContact: string | null;
  about: string;
  personality: string[];
  travelPreferences: string[];
  languages: ProfileLanguage[];
  connectedAccounts: ConnectedAccount[];
  privacy: ProfilePrivacy;
  memberSince: string | null;
};

export type TripStatus = "upcoming" | "current" | "completed" | "cancelled";

export type Trip = {
  id: string;
  reference: string;
  propertyId: string;
  propertyName: string;
  image: string | null;
  city: string | null;
  country: string | null;
  hostName: string | null;
  checkIn: string;
  checkOut: string;
  bookedOn: string;
  status: TripStatus;
  guests: number;
  paymentStatus: string | null;
  totalPaid: number | null;
  currency: string;
  /** Set once cancelled: how much is coming back and where that refund is. */
  refundAmount: number | null;
  refundStatus: string | null;
  cancelledAt: string | null;
  /**
   * Whether the guest may still cancel this themselves. False once the stay has
   * started, and once it is already cancelled or completed — the same rule the
   * database enforces, mirrored here so the button is not offered and then
   * refused.
   */
  canCancel: boolean;
};

export type ProfileStats = {
  tripsCompleted: number;
  tripsUpcoming: number;
  tripsCancelled: number;
  wishlistCount: number;
  reviewsWritten: number;
  /** Null when the guest has written no rated reviews — not 0, which reads as "bad". */
  averageRatingGiven: number | null;
  favoriteDestinations: string[];
};

export type ProfileCompletion = {
  percent: number;
  complete: string[];
  missing: string[];
};

const DEFAULT_PRIVACY: ProfilePrivacy = {
  publicProfile: true,
  showWishlists: false,
};

/** Neutral silhouette. A generated avatar would be inventing a likeness. */
export const DEFAULT_AVATAR = "/images/default-avatar.svg";

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asLanguages(v: unknown): ProfileLanguage[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const o = x as Record<string, unknown>;
    if (typeof o.name !== "string" || !o.name.trim()) return [];
    return [
      {
        id: typeof o.id === "string" ? o.id : o.name.toLowerCase(),
        name: o.name,
        level: typeof o.level === "string" ? o.level : "",
        verified: o.verified === true,
      },
    ];
  });
}

/**
 * Which social logins are actually linked, straight from Supabase Auth.
 *
 * Read from auth identities rather than a stored column so it cannot drift out
 * of sync with reality — the spec asks for "only accounts actually connected".
 */
function connectedFromIdentities(
  identities: { provider?: string }[] | undefined,
): ConnectedAccount[] {
  const linked = new Set((identities ?? []).map((i) => i.provider));
  return [
    { provider: "facebook", connected: linked.has("facebook") },
    { provider: "google", connected: linked.has("google") },
  ];
}

/** The signed-in guest's profile, or null when nobody is signed in. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) console.error("[profile] read failed:", error.message);

  // The signup trigger creates the row, but a profile read must never be the
  // thing that breaks the page — fall back to what auth itself knows.
  const r = (row ?? {}) as Record<string, unknown>;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : "";

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const fullName = str(r.full_name) || metaName;

  return {
    id: user.id,
    fullName,
    legalName: str(r.legal_name) || fullName,
    location: str(r.location),
    avatarUrl: str(r.avatar_url) || str(meta.avatar_url) || DEFAULT_AVATAR,
    identityVerified: r.identity_verified === true,
    email: str(r.email) || user.email || "",
    phone: str(r.phone) || str(user.phone),
    emergencyContact: str(r.emergency_contact) || null,
    about: str(r.bio),
    personality: asStringArray(r.personality),
    travelPreferences: asStringArray(r.travel_preferences),
    languages: asLanguages(r.languages),
    connectedAccounts: connectedFromIdentities(user.identities),
    privacy:
      r.privacy && typeof r.privacy === "object"
        ? { ...DEFAULT_PRIVACY, ...(r.privacy as Partial<ProfilePrivacy>) }
        : DEFAULT_PRIVACY,
    memberSince: str(r.created_at) || user.created_at || null,
  };
}

/**
 * Classifies a booking for display.
 *
 * A stay only counts as completed once the guest has actually checked out —
 * a confirmed booking for next month is upcoming, not a trip taken. Getting
 * this wrong would inflate the trip count the moment someone books.
 */
function tripStatus(
  status: string | null,
  checkIn: string,
  checkOut: string,
  today: string,
): TripStatus {
  if (status === "cancelled") return "cancelled";
  if (checkOut < today) return "completed";
  if (checkIn <= today) return "current"; // checked in, not yet checked out
  return "upcoming";
}

type BookingRow = {
  id: string;
  reference: string | null;
  property_id: string;
  check_in: string;
  check_out: string;
  created_at: string;
  status: string | null;
  guests: number | null;
  payment_status: string | null;
  total_price: number | null;
  currency: string | null;
  refunded_amount: number | null;
  refund_status: string | null;
  cancelled_at: string | null;
  properties: {
    name: string | null;
    city: string | null;
    country: string | null;
    hosts: { name: string | null } | null;
    property_images: { url: string | null }[] | null;
  } | null;
};

/** Every trip the signed-in guest has booked, newest first. */
export async function getTrips(): Promise<Trip[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, reference, property_id, check_in, check_out, created_at, status,
       guests, payment_status, total_price, currency,
       refunded_amount, refund_status, cancelled_at,
       properties ( name, city, country,
                    hosts ( name ),
                    property_images ( url ) )`,
    )
    .eq("guest_id", user.id)
    .order("check_in", { ascending: false });

  if (error) {
    console.error("[profile] trips read failed:", error.message);
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);
  return ((data ?? []) as unknown as BookingRow[]).map((b) => ({
    id: b.id,
    reference: b.reference ?? "",
    propertyId: b.property_id,
    propertyName: b.properties?.name ?? "This stay",
    image: b.properties?.property_images?.[0]?.url ?? null,
    city: b.properties?.city ?? null,
    country: b.properties?.country ?? null,
    hostName: b.properties?.hosts?.name ?? null,
    checkIn: b.check_in,
    checkOut: b.check_out,
    bookedOn: b.created_at,
    status: tripStatus(b.status, b.check_in, b.check_out, today),
    guests: b.guests ?? 1,
    paymentStatus: b.payment_status,
    totalPaid: b.total_price,
    currency: b.currency ?? "INR",
    refundAmount: b.refunded_amount,
    refundStatus: b.refund_status,
    cancelledAt: b.cancelled_at,
    // `check_in > today` rather than the derived status, so the rule reads the
    // same way it does in the database.
    canCancel: b.status !== "cancelled" && b.status !== "completed" && b.check_in > today,
  }));
}

/**
 * Activity counts, derived from the tables — never stored on the profile, so
 * they cannot go stale or be edited by hand.
 */
export async function getProfileStats(trips?: Trip[]): Promise<ProfileStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: ProfileStats = {
    tripsCompleted: 0,
    tripsUpcoming: 0,
    tripsCancelled: 0,
    wishlistCount: 0,
    reviewsWritten: 0,
    averageRatingGiven: null,
    favoriteDestinations: [],
  };
  if (!user) return empty;

  const list = trips ?? (await getTrips());

  const [{ count: wishlistCount }, { data: reviews }] = await Promise.all([
    supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase.from("reviews").select("rating").eq("author_user_id", user.id),
  ]);

  // Imported reviews carry no rating, so average over the rated ones only.
  // `reviews.rating` arrived in migration 0020; database.types.ts is generated
  // and still predates it, hence the cast. Regenerating the types removes it.
  const rated = ((reviews ?? []) as unknown as { rating: number | null }[])
    .map((r) => r.rating)
    .filter((n): n is number => typeof n === "number");

  // Most-visited places, from stays actually taken.
  const tally = new Map<string, number>();
  for (const t of list) {
    if (t.status !== "completed") continue;
    const place = [t.city, t.country].filter(Boolean).join(", ");
    if (place) tally.set(place, (tally.get(place) ?? 0) + 1);
  }

  return {
    tripsCompleted: list.filter((t) => t.status === "completed").length,
    tripsUpcoming: list.filter(
      (t) => t.status === "upcoming" || t.status === "current",
    ).length,
    tripsCancelled: list.filter((t) => t.status === "cancelled").length,
    wishlistCount: wishlistCount ?? 0,
    reviewsWritten: reviews?.length ?? 0,
    averageRatingGiven: rated.length
      ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10
      : null,
    favoriteDestinations: [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([place]) => place),
  };
}

/**
 * How much of the profile is filled in.
 *
 * Only counts fields the guest can actually control — identity verification and
 * the language `verified` flags are system-set, so including them would show a
 * percentage nobody can move.
 */
export function getProfileCompletion(profile: Profile): ProfileCompletion {
  const fields: [string, boolean][] = [
    ["Name", profile.fullName.trim().length > 0],
    ["Email", profile.email.trim().length > 0],
    ["Profile picture", profile.avatarUrl !== DEFAULT_AVATAR],
    ["Phone", profile.phone.trim().length > 0],
    ["Location", profile.location.trim().length > 0],
    ["About me", profile.about.trim().length > 0],
    ["Languages", profile.languages.length > 0],
    ["Personality", profile.personality.length > 0],
    ["Travel preferences", profile.travelPreferences.length > 0],
    ["Emergency contact", (profile.emergencyContact ?? "").trim().length > 0],
  ];

  const complete = fields.filter(([, done]) => done).map(([label]) => label);
  return {
    percent: Math.round((complete.length / fields.length) * 100),
    complete,
    missing: fields.filter(([, done]) => !done).map(([label]) => label),
  };
}
