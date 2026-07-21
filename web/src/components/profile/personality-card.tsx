"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { ProfileFormValues } from "@/lib/profile-schema";

const TONES = [
  "bg-primary-container text-on-primary-container",
  "bg-primary-container text-on-primary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-surface-container-highest text-on-surface-variant",
];

/** Editable, animated personality tags. */
export function PersonalityCard() {
  const { watch, setValue } = useFormContext<ProfileFormValues>();
  const tags = watch("personality") ?? [];
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = (next: string[]) =>
    setValue("personality", next, { shouldDirty: true, shouldValidate: true });

  const add = () => {
    const value = draft.trim();
    if (value && !tags.includes(value) && tags.length < 12) commit([...tags, value]);
    setDraft("");
    setAdding(false);
  };

  const remove = (tag: string) => commit(tags.filter((t) => t !== tag));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    } else if (e.key === "Escape") {
      setDraft("");
      setAdding(false);
    }
  };

  return (
    <section className="bg-surface-container-low rounded-[20px] p-6 md:p-10 shadow-tinted border border-outline-variant/10">
      <h3 className="font-display text-2xl font-semibold text-on-surface mb-6">Personality</h3>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {tags.map((tag, i) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18 }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
                TONES[i % TONES.length],
              )}
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={`Remove ${tag}`}
                className="rounded-full hover:opacity-60 transition-opacity"
              >
                <X aria-hidden className="size-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={add}
            aria-label="New personality tag"
            placeholder="Add tag"
            className="px-3 py-1 rounded-full text-xs bg-white border border-primary outline-none w-28 focus:ring-1 focus:ring-primary"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label="Add personality tag"
            className="w-8 h-8 rounded-full border border-primary text-primary flex items-center justify-center hover:bg-primary/10 transition-colors"
          >
            <Plus aria-hidden className="size-4" />
          </button>
        )}
      </div>
    </section>
  );
}
