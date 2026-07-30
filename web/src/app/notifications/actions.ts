"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Notification actions. Every one is scoped to the signed-in user, and RLS
 * repeats the restriction — an id belonging to someone else simply matches
 * nothing rather than erroring, which is the behaviour we want.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[notifications] mark read failed:", error.message);
    return { ok: false, error: "Couldn't update that notification." };
  }
  revalidatePath("/notifications");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("[notifications] mark all read failed:", error.message);
    return { ok: false, error: "Couldn't update your notifications." };
  }
  revalidatePath("/notifications");
  return { ok: true };
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[notifications] delete failed:", error.message);
    return { ok: false, error: "Couldn't delete that notification." };
  }
  revalidatePath("/notifications");
  return { ok: true };
}

export async function clearAllNotifications(): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("[notifications] clear all failed:", error.message);
    return { ok: false, error: "Couldn't clear your notifications." };
  }
  revalidatePath("/notifications");
  return { ok: true };
}
