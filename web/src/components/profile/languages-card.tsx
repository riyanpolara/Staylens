"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { ProfileFormValues } from "@/lib/profile-schema";

/** Languages list with per-row verification state and an inline add form. */
export function LanguagesCard() {
  const { control } = useFormContext<ProfileFormValues>();
  const { fields, append } = useFieldArray({ control, name: "languages" });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");

  const submit = () => {
    if (!name.trim() || !level.trim()) return;
    append({
      id: crypto.randomUUID(),
      name: name.trim(),
      level: level.trim(),
      verified: false,
    });
    setName("");
    setLevel("");
    setAdding(false);
  };

  return (
    <section className="bg-white rounded-[20px] p-6 md:p-10 shadow-tinted border border-outline-variant/10">
      <h3 className="font-display text-2xl font-semibold text-on-surface mb-6">Languages</h3>
      <div className="space-y-4">
        <ul className="space-y-4">
          {fields.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl"
            >
              <span className="text-sm font-semibold">
                {f.name} ({f.level})
              </span>
              {f.verified ? (
                <CheckCircle2 aria-label="Verified" className="size-5 text-primary" />
              ) : (
                <Circle aria-label="Not verified" className="size-5 text-outline-variant" />
              )}
            </li>
          ))}
        </ul>

        {adding ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Language"
              aria-label="Language"
              className="flex-1 h-10 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <input
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="Level"
              aria-label="Proficiency level"
              className="flex-1 h-10 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submit}
                className="px-4 h-10 rounded-lg text-white text-sm font-semibold cta-gradient hover:opacity-90 transition-opacity"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="px-4 h-10 rounded-lg border border-outline-variant/50 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full py-2 text-primary text-sm font-semibold text-center hover:underline"
          >
            + Add Language
          </button>
        )}
      </div>
    </section>
  );
}
