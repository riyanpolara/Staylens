import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { GuestDetails } from "@/components/checkout/checkout-types";

/**
 * Pre-fills the checkout Guest Details from the signed-in account.
 *
 * A guest who has already told us their name and email should not be asked
 * again, so this is resolved on the server and handed to the form as its
 * initial value — no loading flash, no empty fields on first paint.
 *
 * `profiles` is the source of truth because that is what the guest edits in
 * their account. Auth metadata is only a fallback for rows the profile trigger
 * never filled (OAuth sign-ups, older accounts).
 *
 * Returns empty strings rather than throwing: a failed profile read should slow
 * the guest down, not block the booking.
 */
export async function getGuestDefaults(): Promise<GuestDetails> {
  const empty: GuestDetails = { firstName: "", lastName: "", email: "", phone: "" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, first_name, last_name, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Auth metadata keys vary by provider; check the two common spellings.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : "";

  const [splitFirst, ...splitRest] = (profile?.full_name || metaName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: (profile?.first_name || splitFirst || "").trim(),
    lastName: (profile?.last_name || splitRest.join(" ") || "").trim(),
    // Auth guarantees an email for password sign-ups, so this is the one field
    // that is reliably non-empty.
    email: (profile?.email || user.email || "").trim(),
    phone: (user.phone || "").trim(),
  };
}
