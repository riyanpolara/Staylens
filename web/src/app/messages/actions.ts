"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { raiseNotification } from "@/lib/notifications";

/**
 * Message actions.
 *
 * Access is deliberately narrow: a guest may only open a conversation about a
 * property they have actually booked, or continue one that already exists. The
 * spec is explicit that people must not be able to message every host on the
 * platform, and that rule is enforced here on the server rather than by hiding
 * a button.
 */

export type SendResult =
  | { ok: true; messageId: string; createdAt: string }
  | { ok: false; error: string };

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<SendResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Write a message first." };
  if (text.length > 4000) return { ok: false, error: "That message is too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to send messages." };

  // Membership check. RLS enforces it too, but reading the row first lets us
  // return a clear error and work out who the recipient is.
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, guest_id, host_user_id, property_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) return { ok: false, error: "That conversation isn't available." };

  const c = conv as {
    id: string;
    guest_id: string;
    host_user_id: string | null;
    property_id: string | null;
  };
  const isGuest = c.guest_id === user.id;
  const isHost = c.host_user_id === user.id;
  if (!isGuest && !isHost) {
    return { ok: false, error: "That conversation isn't available." };
  }

  // Null while the host has no account — there is no user row to address yet.
  const receiverId = isGuest ? c.host_user_id : c.guest_id;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      body: text,
    })
    .select("id, created_at")
    .single();

  if (error || !data) {
    console.error("[messages] send failed:", error?.message);
    return { ok: false, error: "Your message couldn't be sent. Please try again." };
  }

  // Only notify a real account. Raising one for a catalogue host would create
  // a notification nobody can ever read.
  if (receiverId) {
    await raiseNotification({
      userId: receiverId,
      type: "message.received",
      title: "New message",
      description: text.slice(0, 140),
      link: `/messages/${conversationId}`,
      metadata: { conversationId, propertyId: c.property_id },
    });
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);

  const row = data as { id: string; created_at: string };
  return { ok: true, messageId: row.id, createdAt: row.created_at };
}

/** Clears the viewer's unread counter and marks the other side's messages read. */
export async function markConversationRead(
  conversationId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, guest_id, host_user_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return { ok: false };

  const c = conv as { guest_id: string; host_user_id: string | null };
  const isGuest = c.guest_id === user.id;
  if (!isGuest && c.host_user_id !== user.id) return { ok: false };

  // Messages the other person sent are the ones that become read.
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .eq("is_read", false)
    .neq("sender_id", user.id);

  await supabase
    .from("conversations")
    .update(isGuest ? { guest_unread: 0 } : { host_unread: 0 })
    .eq("id", conversationId);

  revalidatePath("/messages");
  return { ok: true };
}

export type StartResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };

/**
 * Opens (or returns) the thread for a property the guest has booked.
 *
 * Requiring a booking is the access rule: without it this would be a way to
 * message any of the 5,376 catalogue hosts unprompted.
 */
export async function startConversation(propertyId: string): Promise<StartResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to message a host." };

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("guest_id", user.id)
    .eq("property_id", propertyId)
    .maybeSingle();
  if (existing) return { ok: true, conversationId: (existing as { id: string }).id };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("guest_id", user.id)
    .eq("property_id", propertyId)
    .limit(1)
    .maybeSingle();

  if (!booking) {
    return {
      ok: false,
      error: "You can message a host once you have a booking for their place.",
    };
  }

  const { data: property } = await supabase
    .from("properties")
    .select("host_id")
    .eq("id", propertyId)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      guest_id: user.id,
      property_id: propertyId,
      booking_id: (booking as { id: string }).id,
      host_profile_id: (property as { host_id: string | null } | null)?.host_id ?? null,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[messages] start conversation failed:", error?.message);
    return { ok: false, error: "Couldn't start that conversation." };
  }

  revalidatePath("/messages");
  return { ok: true, conversationId: (created as { id: string }).id };
}
