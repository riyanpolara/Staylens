"use client";

import { Paperclip, Send, Smile } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type MessageComposerProps = {
  onSend: (text: string) => void;
  placeholder?: string;
  /** disable input (e.g. while a send is in flight) */
  disabled?: boolean;
  /** show attach/emoji affordances (visual only) */
  showTools?: boolean;
  className?: string;
};

/**
 * Reusable message composer — auto-growing textarea, Enter-to-send
 * (Shift+Enter for a newline), send button disabled while empty.
 */
export function MessageComposer({
  onSend,
  placeholder = "Write a message…",
  disabled = false,
  showTools = true,
  className,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div
      className={cn(
        "flex items-end gap-2 bg-surface-container-lowest border-[1.5px] border-outline rounded-2xl px-2 py-2 focus-within:border-primary transition-colors shadow-tinted",
        className,
      )}
    >
      {showTools && (
        <button
          type="button"
          aria-label="Add attachment"
          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
        >
          <Paperclip aria-hidden className="size-5" />
        </button>
      )}
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value);
          autoGrow();
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Message"
        className="flex-1 resize-none border-0 bg-transparent focus:ring-0 focus:outline-none py-2 px-1 text-on-surface placeholder:text-outline/60 max-h-40"
      />
      {showTools && (
        <button
          type="button"
          aria-label="Add emoji"
          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
        >
          <Smile aria-hidden className="size-5" />
        </button>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={!canSend}
        aria-label="Send message"
        className={cn(
          "shrink-0 flex items-center justify-center gap-2 rounded-xl h-10 px-4 font-semibold transition-all active:scale-95",
          canSend
            ? "cta-gradient text-white shadow-md"
            : "bg-surface-container text-on-surface-variant cursor-not-allowed",
        )}
      >
        <span className="hidden sm:inline">Send</span>
        <Send aria-hidden className="size-4" />
      </button>
    </div>
  );
}
