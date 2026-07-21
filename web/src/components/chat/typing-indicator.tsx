import Image from "next/image";
import type { ChatParticipant } from "@/components/chat/chat-types";

/** Three-dot "typing…" bubble for a participant (UI affordance, no realtime). */
export function TypingIndicator({ host }: { host: ChatParticipant }) {
  return (
    <div className="flex items-end gap-2 mr-auto mt-4" aria-live="polite" aria-label={`${host.name} is typing`}>
      {host.avatarUrl ? (
        <Image
          src={host.avatarUrl}
          alt=""
          width={32}
          height={32}
          unoptimized={host.avatarUrl.includes("muscache")}
          className="w-8 h-8 rounded-full object-cover shrink-0"
        />
      ) : (
        <span className="w-8 h-8 rounded-full bg-primary-fixed/60 shrink-0" />
      )}
      <div className="bg-surface-container rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-2 h-2 rounded-full bg-on-surface-variant/60 animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
