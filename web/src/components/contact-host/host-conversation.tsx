"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { MessageThread } from "@/components/chat/message-thread";
import { MessageComposer } from "@/components/chat/message-composer";
import { QuickReplies } from "@/components/chat/quick-replies";
import type { ChatMessage, ChatParticipant } from "@/components/chat/chat-types";

let counter = 0;
const uid = () => `m${Date.now()}_${counter++}`;

/**
 * The Contact Host messaging UI. Composes the reusable chat components with
 * local state only — messages are appended optimistically; there is NO
 * realtime/backend delivery yet (a preview note makes that explicit).
 */
export function HostConversation({
  host,
  welcome,
  quickReplies,
}: {
  host: ChatParticipant;
  welcome: string;
  quickReplies: string[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      body: welcome,
      author: "host",
      createdAt: new Date(Date.now() - 3_600_000).toISOString(),
      status: "read",
    },
  ]);
  const [showQuick, setShowQuick] = useState(true);

  function send(text: string) {
    const id = uid();
    setMessages((prev) => [
      ...prev,
      { id, body: text, author: "guest", createdAt: new Date().toISOString(), status: "sending" },
    ]);
    setShowQuick(false);
    // optimistic UI only — flip to "sent" locally (no delivery yet)
    window.setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "sent" } : m)),
      );
    }, 600);
  }

  return (
    <section aria-label="Conversation" className="flex flex-col rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-tinted overflow-hidden">
      {/* conversation header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/20 bg-surface-container-low/60">
        {host.avatarUrl ? (
          <Image
            src={host.avatarUrl}
            alt={host.name}
            width={40}
            height={40}
            unoptimized={host.avatarUrl.includes("muscache")}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <span className="w-10 h-10 rounded-full bg-primary-fixed/60 text-on-primary-fixed-variant font-bold flex items-center justify-center">
            {host.name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-on-surface flex items-center gap-1">
            {host.name}
            <ShieldCheck aria-hidden className="size-4 text-primary-container" />
          </p>
          {host.subtitle && (
            <p className="text-xs text-on-surface-variant truncate">{host.subtitle}</p>
          )}
        </div>
      </header>

      {/* thread */}
      <MessageThread
        messages={messages}
        host={host}
        className="flex-1 min-h-[240px] max-h-[460px] overflow-y-auto px-4 py-2"
      />

      {/* composer + quick replies */}
      <div className="border-t border-outline-variant/20 p-3 space-y-3 bg-surface-container-lowest">
        {showQuick && <QuickReplies options={quickReplies} onSelect={send} />}
        <MessageComposer onSend={send} placeholder={`Message ${host.name}…`} />
        <p className="text-center text-xs text-on-surface-variant">
          This is a preview — messages aren&apos;t delivered yet.
        </p>
      </div>
    </section>
  );
}
