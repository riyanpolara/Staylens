"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  CreditCard,
  Heart,
  MessageSquare,
  Star,
  Trash2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification, NotificationGroup } from "@/lib/notifications";
import {
  clearAllNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notifications/actions";

/**
 * Icon per notification family, keyed on the part before the dot — so a new
 * `booking.*` kind picks up the right icon with no change here.
 *
 * A static map rather than a function that returns a component: React's
 * static-components rule flags the latter, and a lookup is what this always
 * was anyway. Unknown families fall back to the bell.
 */
const FAMILY_ICON: Record<string, LucideIcon> = {
  booking: CalendarCheck,
  payment: CreditCard,
  // A refund is money moving, so it belongs with payments.
  refund: CreditCard,
  message: MessageSquare,
  review: Star,
  wishlist: Heart,
  account: UserCheck,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Row({
  n,
  onRead,
  onDelete,
  busy,
}: {
  n: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const Icon = FAMILY_ICON[n.type.split(".")[0]] ?? Bell;

  const inner = (
    <>
      <span
        className={cn(
          "shrink-0 grid place-items-center size-10 rounded-full",
          n.isRead
            ? "bg-surface-container text-on-surface-variant"
            : "bg-primary-container text-on-primary-container",
        )}
      >
        <Icon aria-hidden className="size-5" strokeWidth={2.2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm",
              n.isRead ? "text-on-surface-variant" : "font-semibold text-on-surface",
            )}
          >
            {n.title}
          </span>
          {!n.isRead && (
            <span
              aria-label="Unread"
              className="shrink-0 size-2 rounded-full bg-primary"
            />
          )}
        </span>
        {/* pre-line: the refund confirmation is deliberately multi-line
            (property, dates, amount). Three lines keeps the list tidy while
            still showing the figures that matter. */}
        {n.description && (
          <span className="block text-sm text-on-surface-variant mt-0.5 line-clamp-3 whitespace-pre-line">
            {n.description}
          </span>
        )}
        <span className="block text-xs text-on-surface-variant mt-1">
          {timeAgo(n.createdAt)}
        </span>
      </span>
    </>
  );

  return (
    <li
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl transition-colors",
        n.isRead ? "bg-transparent" : "bg-surface-container-low",
        busy && "opacity-60",
      )}
    >
      {n.link ? (
        <Link
          href={n.link}
          onClick={() => !n.isRead && onRead(n.id)}
          className="flex items-start gap-4 flex-1 min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 rounded-lg"
        >
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => !n.isRead && onRead(n.id)}
          className="flex items-start gap-4 flex-1 min-w-0 text-left"
        >
          {inner}
        </button>
      )}

      <button
        type="button"
        onClick={() => onDelete(n.id)}
        disabled={busy}
        aria-label={`Delete notification: ${n.title}`}
        className="shrink-0 p-2 rounded-lg text-on-surface-variant hover:text-destructive hover:bg-surface-container transition-colors"
      >
        <Trash2 aria-hidden className="size-4" />
      </button>
    </li>
  );
}

export function NotificationsClient({
  groups: initialGroups,
  unread,
}: {
  groups: NotificationGroup[];
  unread: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Optimistic removal — waiting for a round trip to hide a deleted row makes
  // the button feel broken.
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [clearedAll, setClearedAll] = useState(false);

  const groups = clearedAll
    ? []
    : initialGroups
        .map((g) => ({
          ...g,
          items: g.items
            .filter((n) => !removed.has(n.id))
            .map((n) => (readIds.has(n.id) ? { ...n, isRead: true } : n)),
        }))
        .filter((g) => g.items.length > 0);

  const unreadNow = groups.reduce(
    (sum, g) => sum + g.items.filter((n) => !n.isRead).length,
    0,
  );

  function onRead(id: string) {
    setReadIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await markNotificationRead(id);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    setBusyId(id);
    setRemoved((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const res = await deleteNotification(id);
      if (!res.ok) {
        // Put it back rather than pretending it went.
        setRemoved((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      setBusyId(null);
      router.refresh();
    });
  }

  function onMarkAll() {
    const all = new Set(readIds);
    groups.forEach((g) => g.items.forEach((n) => all.add(n.id)));
    setReadIds(all);
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  function onClearAll() {
    setClearedAll(true);
    startTransition(async () => {
      const res = await clearAllNotifications();
      if (!res.ok) setClearedAll(false);
      router.refresh();
    });
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-[20px] p-12 text-center shadow-tinted border border-outline-variant/10">
        <Bell aria-hidden className="size-10 mx-auto text-primary" strokeWidth={1.8} />
        <p className="font-display text-xl font-semibold text-on-surface mt-4">
          You&rsquo;re all caught up!
        </p>
        <p className="text-sm text-on-surface-variant mt-1">No new notifications.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <p className="text-on-surface-variant text-sm mr-auto">
          {unreadNow > 0 ? `${unreadNow} unread` : "All read"}
          {unread !== unreadNow ? "" : ""}
        </p>
        <button
          type="button"
          onClick={onMarkAll}
          disabled={pending || unreadNow === 0}
          className="text-sm font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
        >
          Mark all as read
        </button>
        <button
          type="button"
          onClick={onClearAll}
          disabled={pending}
          className="text-sm font-semibold text-destructive hover:underline disabled:opacity-50"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.label}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-3">
              {g.label}
            </h2>
            <ul className="space-y-2">
              {g.items.map((n) => (
                <Row
                  key={n.id}
                  n={n}
                  onRead={onRead}
                  onDelete={onDelete}
                  busy={busyId === n.id}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
