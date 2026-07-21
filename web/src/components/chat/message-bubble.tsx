import Image from "next/image";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatMessageTime,
  type ChatMessage,
  type ChatParticipant,
} from "@/components/chat/chat-types";

type MessageBubbleProps = {
  message: ChatMessage;
  host: ChatParticipant;
  /** hide the avatar/tail when the previous message was from the same author */
  grouped?: boolean;
};

/** A single chat bubble — guest (right, gradient) vs host (left, surface). */
export function MessageBubble({ message, host, grouped = false }: MessageBubbleProps) {
  const isGuest = message.author === "guest";

  return (
    <div
      className={cn(
        "flex items-end gap-2 max-w-[85%] sm:max-w-[70%]",
        isGuest ? "ml-auto flex-row-reverse" : "mr-auto",
        grouped ? "mt-1" : "mt-4",
      )}
    >
      {/* host avatar (only on the first of a group) */}
      {!isGuest &&
        (grouped ? (
          <span className="w-8 shrink-0" aria-hidden />
        ) : host.avatarUrl ? (
          <Image
            src={host.avatarUrl}
            alt={host.name}
            width={32}
            height={32}
            unoptimized={host.avatarUrl.includes("muscache")}
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-primary-fixed/60 text-on-primary-fixed-variant text-xs font-bold flex items-center justify-center shrink-0">
            {host.name.slice(0, 1)}
          </span>
        ))}

      <div className={cn("flex flex-col", isGuest ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words",
            isGuest
              ? "cta-gradient text-white rounded-2xl rounded-br-md"
              : "bg-surface-container text-on-surface rounded-2xl rounded-bl-md",
          )}
        >
          {message.body}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 mt-1 px-1 text-[11px] text-on-surface-variant",
            isGuest ? "flex-row-reverse" : "",
          )}
        >
          <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
          {isGuest && message.status && (
            <span aria-label={`Message ${message.status}`}>
              {message.status === "read" ? (
                <CheckCheck className="size-3.5 text-primary" />
              ) : message.status === "sent" ? (
                <Check className="size-3.5" />
              ) : (
                <span className="inline-block w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
