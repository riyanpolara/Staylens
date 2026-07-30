import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Conversation and message reads for the signed-in user.
 *
 * Every query filters on the user explicitly even though RLS would already do
 * it. The policy is the guarantee; the filter is what makes the intent visible
 * at the call site and keeps a mistake from turning into a wide scan.
 *
 * See migration 0021 for why the host side is modelled as a catalogue record
 * plus a nullable account.
 */

export type ConversationSummary = {
  id: string;
  bookingId: string | null;
  bookingRef: string | null;
  propertyId: string | null;
  propertyName: string | null;
  counterpartName: string;
  counterpartAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
  /** False until the host has an account — nobody can reply yet. */
  hostCanReply: boolean;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  attachmentUrl: string | null;
  isRead: boolean;
  createdAt: string;
  /** True when the signed-in user wrote it. */
  mine: boolean;
};

export type ConversationDetail = {
  id: string;
  bookingRef: string | null;
  propertyId: string | null;
  propertyName: string | null;
  counterpartName: string;
  counterpartAvatar: string | null;
  hostCanReply: boolean;
  messages: ChatMessage[];
  hasMore: boolean;
};

type ConversationRow = {
  id: string;
  booking_id: string | null;
  property_id: string | null;
  guest_id: string;
  host_user_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  guest_unread: number;
  host_unread: number;
  bookings: { reference: string | null } | null;
  properties: { name: string | null } | null;
  hosts: { name: string | null; thumbnail_url: string | null } | null;
};

const CONVERSATION_SELECT = `
  id, booking_id, property_id, guest_id, host_user_id,
  last_message, last_message_at, guest_unread, host_unread,
  bookings ( reference ),
  properties ( name ),
  hosts ( name, thumbnail_url )
`;

function toSummary(r: ConversationRow, viewerId: string): ConversationSummary {
  const viewerIsGuest = r.guest_id === viewerId;
  return {
    id: r.id,
    bookingId: r.booking_id,
    bookingRef: r.bookings?.reference ?? null,
    propertyId: r.property_id,
    propertyName: r.properties?.name ?? null,
    counterpartName: r.hosts?.name ?? "Host",
    counterpartAvatar: r.hosts?.thumbnail_url ?? null,
    lastMessage: r.last_message,
    lastMessageAt: r.last_message_at,
    // Whichever side you are on, you see your own unread count.
    unread: viewerIsGuest ? r.guest_unread : r.host_unread,
    hostCanReply: r.host_user_id !== null,
  };
}

/** All conversations for the signed-in user, most recent activity first. */
export async function getConversations(): Promise<ConversationSummary[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    // Either side of the thread. RLS enforces the same thing.
    .or(`guest_id.eq.${user.id},host_user_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[messages] conversation list failed:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as ConversationRow[]).map((r) =>
    toSummary(r, user.id),
  );
}

export async function getUnreadMessageCount(): Promise<number> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .from("conversations")
    .select("guest_id, guest_unread, host_unread")
    .or(`guest_id.eq.${user.id},host_user_id.eq.${user.id}`);

  if (error) {
    console.error("[messages] unread count failed:", error.message);
    return 0;
  }
  return ((data ?? []) as { guest_id: string; guest_unread: number; host_unread: number }[])
    .reduce(
      (sum, c) => sum + (c.guest_id === user.id ? c.guest_unread : c.host_unread),
      0,
    );
}

/** Page size for a thread. Long histories load newest-first, oldest on demand. */
export const MESSAGE_PAGE_SIZE = 40;

/**
 * One conversation with its most recent page of messages.
 *
 * Returns null when the id does not belong to the viewer — RLS makes the row
 * invisible rather than raising, so "not found" and "not yours" are the same
 * outcome, which is also what we want to expose.
 */
export async function getConversation(
  id: string,
  { before }: { before?: string } = {},
): Promise<ConversationDetail | null> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (convErr || !conv) return null;
  const summary = toSummary(conv as unknown as ConversationRow, user.id);

  let q = supabase
    .from("messages")
    .select("id, sender_id, body, attachment_url, is_read, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE + 1); // one extra reveals whether more exist
  if (before) q = q.lt("created_at", before);

  const { data: rows, error: msgErr } = await q;
  if (msgErr) {
    console.error("[messages] thread read failed:", msgErr.message);
    return { ...summary, messages: [], hasMore: false };
  }

  const page = (rows ?? []) as unknown as {
    id: string;
    sender_id: string;
    body: string;
    attachment_url: string | null;
    is_read: boolean;
    created_at: string;
  }[];

  const hasMore = page.length > MESSAGE_PAGE_SIZE;
  const messages = page
    .slice(0, MESSAGE_PAGE_SIZE)
    .reverse() // fetched newest-first for the limit; display oldest-first
    .map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      body: m.body,
      attachmentUrl: m.attachment_url,
      isRead: m.is_read,
      createdAt: m.created_at,
      mine: m.sender_id === user.id,
    }));

  return { ...summary, messages, hasMore };
}
