"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileFormSchema, type ProfileFormValues } from "@/lib/profile-schema";
import { raiseNotification } from "@/lib/notifications";

export type SaveProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Persist the profile form for the signed-in guest.
 *
 * Validated server-side, then written to that user's own row. The row id is
 * taken from the session, never from the request — a client-supplied id would
 * let anyone overwrite another person's profile.
 *
 * A failed write is reported as a failure. This used to swallow the error and
 * report success, which meant edits silently vanished on refresh.
 */
export async function saveProfile(values: ProfileFormValues): Promise<SaveProfileResult> {
  const parsed = profileFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Some fields need attention. Please review and try again." };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }

  const payload = {
    id: user.id,
    legal_name: v.legalName,
    full_name: v.legalName,
    phone: v.phone,
    location: v.location,
    emergency_contact: v.emergencyContact || null,
    bio: v.about,
    personality: v.personality,
    travel_preferences: v.travelPreferences,
    languages: v.languages,
    privacy: v.privacy,
    updated_at: new Date().toISOString(),
    // `email` is intentionally not written here: it is authentication state and
    // changing it must go through Supabase's verification flow, not a form post.
    // `identity_verified` is likewise system-set and never self-declared.
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = supabase.from("profiles") as any;
  const { error } = await table.upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[profile] save failed:", error.message);
    return { ok: false, error: "We couldn't save your changes. Please try again." };
  }

  await raiseNotification({
    userId: user.id,
    type: "account.profile_updated",
    title: "Profile updated",
    description: "Your profile details were saved.",
    link: "/profile/edit",
  });

  // The profile page is server-rendered, so it must be re-fetched to show the
  // new values rather than serving the pre-edit render.
  revalidatePath("/profile/edit");
  return { ok: true };
}

export type UploadAvatarResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Upload an avatar to the `avatars` Storage bucket and return its public URL. */
export async function uploadAvatar(formData: FormData): Promise<UploadAvatarResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose an image." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "That file isn’t an image." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Images must be under 5 MB." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

    // Namespaced by user id so one guest's upload can never overwrite another's,
    // and so a storage policy can restrict writes to the owner's own folder.
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      console.error("[profile] avatar upload failed:", error.message);
      return { ok: false, error: "Storage isn’t configured yet — showing a local preview." };
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);

    // Persist it, or the new picture disappears on the next page load.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from("profiles") as any;
    const { error: saveErr } = await table
      .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (saveErr) {
      console.error("[profile] avatar save failed:", saveErr.message);
      return { ok: false, error: "Uploaded, but we couldn’t save it to your profile." };
    }

    revalidatePath("/profile/edit");
    return { ok: true, url: data.publicUrl };
  } catch (err) {
    console.error("[profile] avatar upload error:", err);
    return { ok: false, error: "Storage isn’t configured yet — showing a local preview." };
  }
}
