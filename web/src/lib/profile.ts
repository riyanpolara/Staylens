import { createStaticClient } from "@/lib/supabase/static";

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

export type TravelHistory = {
  countries: number;
  lastTrip: string;
  coverImage: string;
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
  languages: ProfileLanguage[];
  travelHistory: TravelHistory;
  connectedAccounts: ConnectedAccount[];
  privacy: ProfilePrivacy;
};

/** Demo profile — verbatim from the Stitch "Edit Profile" screen. Used as the
 *  fallback until a real `profiles` row exists. */
export const DEMO_PROFILE: Profile = {
  id: "demo",
  fullName: "Alex Rivera",
  legalName: "Alex Rivera",
  location: "Barcelona, Spain",
  avatarUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuB6V0mCOUz7QUY_Iaq-CgVYNbeMMUtpvMM74RjvVm0kBZMb5NXzbjHISxRMZSQJLgkcgjHjp5g_fXV1JCOLeSPvYI4Zy-RX1JYmfUYhh9iPukuKV8HxIIrIMKG2rfuLOHmfV-1BqnspW_Lvtk72cOU6IbBnKM2e1i_ju2AGGxWNcM7DzU0Sz5IIQ4721Rl4190HB9prGvi8PFFAs-dlwAz0jHRYGQS6GxpTNFAtb8iZgftFtpbgOKdoPg",
  identityVerified: true,
  email: "alex.rivera@staylens.com",
  phone: "+34 6** *** 892",
  emergencyContact: null,
  about:
    "Architect by day, traveler by nature. I seek spaces that blur the line between indoor comfort and outdoor serenity. Always looking for the perfect morning light and a quiet spot to sketch.",
  personality: ["Quiet Seeker", "Design Lover", "Photography", "Slow Travel"],
  languages: [
    { id: "en", name: "English", level: "Native", verified: true },
    { id: "es", name: "Spanish", level: "Fluent", verified: true },
    { id: "ca", name: "Catalan", level: "Intermediate", verified: true },
  ],
  travelHistory: {
    countries: 14,
    lastTrip: "Kyoto, Japan",
    coverImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBX3S_kcJQNdgt4FvDPiu2DDNQIOvKyZfxoDfxBwBghg0Q7mD2E33vZXCIFnU_3_v0kccJ8B-BqZIUg-q2Tc_8-U44cGi9Ld0zZLBECGCGopJy_A8kPuZnWlxzabeJo8A4mYGT1UC-Q_dkho528U93-KO4s2oZ_vTWesii1YiIlwAzeHasvYHa3uAiNLR261vGbwZ2m9SIMTNiigvgSIMXur2NS7g6NqblhUnXqq3Fb-4L8kf5RgN4U2w",
  },
  connectedAccounts: [
    { provider: "facebook", connected: true },
    { provider: "google", connected: false },
  ],
  privacy: { publicProfile: true, showWishlists: false },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Profile {
  return {
    id: row.id ?? "profile",
    fullName: row.full_name ?? DEMO_PROFILE.fullName,
    legalName: row.legal_name ?? row.full_name ?? DEMO_PROFILE.legalName,
    location: row.location ?? DEMO_PROFILE.location,
    avatarUrl: row.avatar_url ?? DEMO_PROFILE.avatarUrl,
    identityVerified: row.identity_verified ?? false,
    email: row.email ?? DEMO_PROFILE.email,
    phone: row.phone ?? "",
    emergencyContact: row.emergency_contact ?? null,
    about: row.about ?? "",
    personality: Array.isArray(row.personality) ? row.personality : DEMO_PROFILE.personality,
    languages: Array.isArray(row.languages) ? row.languages : DEMO_PROFILE.languages,
    travelHistory: row.travel_history ?? DEMO_PROFILE.travelHistory,
    connectedAccounts: Array.isArray(row.connected_accounts)
      ? row.connected_accounts
      : DEMO_PROFILE.connectedAccounts,
    privacy: row.privacy ?? DEMO_PROFILE.privacy,
  };
}

/**
 * Load the profile. Reads the first `profiles` row from Supabase; falls back to
 * the Stitch demo profile when the table/row isn't present (so the page renders
 * out of the box, and lights up automatically once the migration is applied).
 */
export async function getProfile(): Promise<Profile> {
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (!error && data) return mapRow(data);
  } catch {
    /* table not present yet — fall through to demo */
  }
  return DEMO_PROFILE;
}
