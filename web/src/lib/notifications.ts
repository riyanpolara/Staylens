import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notification reads, plus the one write the system is allowed to make.
 *
 * There is no INSERT policy for notifications: a browser must never be able to
 * create one, or a user could forge "Payment successful" for themselves. They
 * are raised by database triggers or, for application-level events, through
 * `raiseNotification` below using the service role.
 */

/**
 * Every notification kind the app can raise.
 *
 * A closed set, not a free-text field: this used to end in `(string & {})`,
 * which accepted any string and let a typo create a kind nothing renders an
 * icon for and no query can find. Adding a kind now means adding it here, which
 * is the point.
 *
 * The `<family>.<event>` shape is load-bearing — `iconFor()` in the
 * notifications UI switches on the family, so a new `booking.*` kind gets the
 * right icon with no further work.
 *
 * The database column stays `text` rather than an enum: new kinds ship with a
 * code deploy, and an enum would make every addition a migration for no
 * integrity gain that this constant does not already provide.
 */
export const NOTIFICATION_TYPES = [
  "account.welcome",
  "account.profile_updated",
  "booking.confirmed",
  "booking.cancelled",
  "booking.reminder",
  "payment.succeeded",
  "payment.failed",
  "refund.completed",
  "message.received",
  "review.reminder",
  "wishlist.price_drop",
  "system",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  description: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

export type NotificationGroup = {
  label: "Today" | "Yesterday" | "Earlier";
  items: Notification[];
};

type Row = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

/**
 * Narrows a stored `text` type to the known set.
 *
 * The column is text, so a row written by an older deploy could hold a kind
 * this build does not know. Falling back to `system` keeps such a row visible
 * with a sensible icon instead of crashing the page or lying about what it is.
 */
function asNotificationType(value: string): NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value)
    ? (value as NotificationType)
    : "system";
}

const toNotification = (r: Row): Notification => ({
  id: r.id,
  type: asNotificationType(r.type),
  title: r.title,
  description: r.description,
  link: r.link,
  metadata: r.metadata ?? {},
  isRead: r.is_read,
  createdAt: r.created_at,
});

/** Most recent first. `limit` keeps the page bounded for heavy accounts. */
export async function getNotifications(limit = 50): Promise<Notification[]> {
  noStore(); // per-user and changes on read — never cache across requests
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, description, link, metadata, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[notifications] read failed:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as Row[]).map(toNotification);
}

export async function getUnreadNotificationCount(): Promise<number> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("[notifications] count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Buckets by calendar day in the *viewer's* terms.
 *
 * Compared against local midnight rather than "within 24 hours" — something
 * sent at 11pm yesterday should read as Yesterday at 9am today, not Today.
 */
export function groupNotifications(items: Notification[]): NotificationGroup[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const groups: Record<NotificationGroup["label"], Notification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  for (const n of items) {
    const t = new Date(n.createdAt).getTime();
    if (t >= startOfToday.getTime()) groups.Today.push(n);
    else if (t >= startOfYesterday.getTime()) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  }

  return (["Today", "Yesterday", "Earlier"] as const)
    .map((label) => ({ label, items: groups[label] }))
    .filter((g) => g.items.length > 0);
}

/**
 * Raise a notification for a user. Server-side callers only.
 *
 * Uses the service role because RLS intentionally forbids inserts — the point
 * is that only the system can do this. Never fails the caller: a booking must
 * not be lost because we could not write its notification.
 */
export async function raiseNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  description?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from("notifications") as any).insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      link: input.link ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) console.error("[notifications] raise failed:", error.message);
  } catch (err) {
    console.error("[notifications] raise skipped:", err);
  }
}
