import Link from "next/link";
import { Bell } from "lucide-react";

/**
 * Unread-count bell for the account pages.
 *
 * A Server Component that takes the count as a prop, deliberately.
 *
 * It was previously a Client Component fetching `/api/unread` in a `useEffect`
 * keyed on `pathname`. That looked fine but did not work: cancelling a booking
 * calls `router.refresh()`, which re-renders Server Components without changing
 * the pathname — so the effect never re-ran and the badge stayed stale until a
 * full reload. Reading the count on the server means every `router.refresh()`
 * and every navigation updates it, with no polling, no realtime and no client
 * JavaScript at all.
 */
export function NotificationBell({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className={`relative grid place-items-center size-10 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors ${className ?? ""}`}
    >
      <Bell aria-hidden className="size-5" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-primary text-white text-[11px] font-bold"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
