"use client";

/** Suggested-message chips that prefill/send common questions. */
export function QuickReplies({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (text: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className="px-4 py-2 rounded-full border border-outline-variant bg-surface-container-lowest text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
