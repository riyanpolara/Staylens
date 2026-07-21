/** Shared chat primitives — reusable across contact-host, future inbox, AI chat. */

export type ChatAuthor = "guest" | "host";

export type ChatMessage = {
  id: string;
  body: string;
  author: ChatAuthor;
  /** ISO timestamp */
  createdAt: string;
  status?: "sending" | "sent" | "read";
};

export type ChatParticipant = {
  name: string;
  avatarUrl?: string | null;
  /** e.g. "Superhost · responds within an hour" */
  subtitle?: string;
};

const TIME_FMT = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
const DAY_FMT = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" });

export function formatMessageTime(iso: string): string {
  return TIME_FMT.format(new Date(iso));
}

export function formatDayDivider(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return DAY_FMT.format(d);
}

/** Group messages into consecutive day buckets for divider rendering. */
export function groupByDay(messages: ChatMessage[]): { day: string; items: ChatMessage[] }[] {
  const groups: { day: string; items: ChatMessage[] }[] = [];
  for (const m of messages) {
    const day = new Date(m.createdAt).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  }
  return groups;
}
