"use server";

import { createClient } from "@/lib/supabase/server";
import { profileFormSchema, type ProfileFormValues } from "@/lib/profile-schema";

export type SaveProfileResult =
  | { ok: true; persisted: boolean }
  | { ok: false; error: string };

/**
 * Persist the profile form. Validated server-side (never trust the client),
 * then upserted into `profiles`. If the table isn't provisioned yet the save
 * is a no-op preview — `persisted` tells the UI which happened.
 */
export async function saveProfile(values: ProfileFormValues): Promise<SaveProfileResult> {
  const parsed = profileFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Some fields need attention. Please review and try again." };
  }
  const v = parsed.data;

  try {
    const supabase = await createClient();
    const payload = {
      id: "profile",
      legal_name: v.legalName,
      full_name: v.legalName,
      email: v.email,
      phone: v.phone,
      emergency_contact: v.emergencyContact || null,
      about: v.about,
      personality: v.personality,
      languages: v.languages,
      connected_accounts: v.connectedAccounts,
      privacy: v.privacy,
      updated_at: new Date().toISOString(),
    };
    // `profiles` isn't in the generated DB types until the migration is applied,
    // so the typed client narrows the payload to `never` — cast past it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from("profiles") as any;
    const { error } = await table.upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("[profile] save skipped (table not ready):", error.message);
      return { ok: true, persisted: false };
    }
    return { ok: true, persisted: true };
  } catch (err) {
    console.warn("[profile] save skipped:", err);
    return { ok: true, persisted: false };
  }
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
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `avatars/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      return { ok: false, error: "Storage isn’t configured yet — showing a local preview." };
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch {
    return { ok: false, error: "Storage isn’t configured yet — showing a local preview." };
  }
}
