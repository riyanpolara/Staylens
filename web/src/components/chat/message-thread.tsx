"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import {
  formatDayDivider,
  groupByDay,
  type ChatMessage,
  type ChatParticipant,
} from "@/components/chat/chat-types";

type MessageThreadProps = {
  messages: ChatMessage[];
  host: ChatParticipant;
  typing?: boolean;
  className?: string;
};

/**
 * Scrollable conversation view — day dividers, grouped bubbles, auto-scroll to
 * the newest message. Pure presentation; state lives in the parent.
 */
export function MessageThread({ messages, host, typing = false, className }: MessageThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  const groups = groupByDay(messages);

  return (
    <div
      role="log"
      aria-label="Conversation with host"
      aria-live="polite"
      className={className}
    >
      {groups.map((group) => (
        <section key={group.day}>
          <div className="flex justify-center my-4">
            <span className="text-xs font-semibold text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
              {formatDayDivider(group.items[0].createdAt)}
            </span>
          </div>
          {group.items.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              host={host}
              grouped={i > 0 && group.items[i - 1].author === m.author}
            />
          ))}
        </section>
      ))}
      {typing && <TypingIndicator host={host} />}
      <div ref={endRef} />
    </div>
  );
}
