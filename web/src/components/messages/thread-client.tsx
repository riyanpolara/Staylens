"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, MapPin, Mic, Paperclip, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/messages";
import { markConversationRead, sendMessage } from "@/app/messages/actions";

/**
 * Message thread.
 *
 * Sends optimistically — the bubble appears immediately and is reconciled when
 * the server answers, so a slow network never makes the composer feel stuck.
 * A send that fails is marked rather than silently dropped.
 */

const DAY = new Intl.DateTimeFormat("en", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const TIME = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

function daySeparatorLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.getTime() >= today.getTime()) return "Today";
  if (d.getTime() >= yesterday.getTime()) return "Yesterday";
  return DAY.format(d);
}

type Pending = ChatMessage & { pending?: boolean; failed?: boolean };

export function ThreadClient({
  conversationId,
  initialMessages,
  canSend,
  hostCanReply,
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
  canSend: boolean;
  /** False while the host has no account — nobody is there to answer. */
  hostCanReply: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [, startTransition] = useTransition();
  const [sent, setSent] = useState<Pending[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages: Pending[] = [...initialMessages, ...sent];

  // Clear the unread badge once the thread is actually on screen.
  useEffect(() => {
    void markConversationRead(conversationId).then(() => router.refresh());
  }, [conversationId, router]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;

    const tempId = `pending-${Date.now()}`;
    const optimistic: Pending = {
      id: tempId,
      senderId: "me",
      body,
      attachmentUrl: null,
      isRead: false,
      createdAt: new Date().toISOString(),
      mine: true,
      pending: true,
    };
    setSent((prev) => [...prev, optimistic]);
    setText("");

    startTransition(async () => {
      const res = await sendMessage(conversationId, body);
      setSent((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? res.ok
              ? { ...m, id: res.messageId, createdAt: res.createdAt, pending: false }
              : { ...m, pending: false, failed: true }
            : m,
        ),
      );
      if (res.ok) router.refresh();
    });
  }

  let lastDay = "";

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] min-h-[420px]">
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-8">
            No messages yet. Say hello.
          </p>
        )}

        {messages.map((m) => {
          const key = dayKey(m.createdAt);
          const showDay = key !== lastDay;
          lastDay = key;

          return (
            <div key={m.id}>
              {showDay && (
                <p className="text-center text-xs text-on-surface-variant my-4">
                  {daySeparatorLabel(m.createdAt)}
                </p>
              )}
              <div className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    m.mine
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-surface-container text-on-surface rounded-bl-md",
                    m.pending && "opacity-60",
                    m.failed && "ring-1 ring-destructive",
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn(
                      "text-[11px] mt-1",
                      m.mine ? "text-white/70" : "text-on-surface-variant",
                    )}
                  >
                    {m.failed
                      ? "Not sent"
                      : m.pending
                        ? "Sending…"
                        : TIME.format(new Date(m.createdAt))}
                    {m.mine && !m.pending && !m.failed && m.isRead ? " · Read" : ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!hostCanReply && (
        // Say so plainly rather than letting someone wait for a reply that
        // cannot come — this host is a catalogue listing with no account.
        <p className="text-xs text-on-surface-variant text-center py-3 border-t border-outline-variant/20">
          This host hasn&rsquo;t joined StayLens yet, so they can&rsquo;t reply here.
          Your messages are saved.
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 pt-4 border-t border-outline-variant/20"
      >
        <div className="flex items-center gap-1 pb-2">
          {/* Attachment affordances are intentionally inert for now — see the
              note in the page. They are shown so the layout is final. */}
          {[
            { icon: ImageIcon, label: "Add a photo" },
            { icon: Paperclip, label: "Attach a file" },
            { icon: MapPin, label: "Share location" },
            { icon: Mic, label: "Record a voice message" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              disabled
              title={`${label} — coming soon`}
              aria-label={`${label} (coming soon)`}
              className="p-2 rounded-lg text-on-surface-variant/50 cursor-not-allowed"
            >
              <Icon aria-hidden className="size-5" />
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e as unknown as React.FormEvent);
            }
          }}
          rows={1}
          disabled={!canSend}
          placeholder={canSend ? "Write a message…" : "You can't reply here"}
          className="flex-1 resize-none py-2.5 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!canSend || !text.trim()}
          aria-label="Send message"
          className="shrink-0 p-3 rounded-xl cta-gradient text-white disabled:opacity-50 active:scale-95 transition-transform"
        >
          <Send aria-hidden className="size-5" />
        </button>
      </form>
    </div>
  );
}
