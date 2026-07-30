import { Check, X } from "lucide-react";
import type { ProfileCompletion } from "@/lib/profile";

/**
 * Profile completion.
 *
 * Lists what is filled in and what is not, so the number is explainable rather
 * than mysterious — a guest can see exactly which field moves it. Only fields
 * the guest can edit are counted; a percentage nobody can raise is just noise.
 */
export function ProfileCompletionCard({ completion }: { completion: ProfileCompletion }) {
  const { percent, complete, missing } = completion;
  const done = percent === 100;

  return (
    <section className="bg-white rounded-[20px] p-6 md:p-10 shadow-tinted border border-outline-variant/10">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-2xl font-semibold text-on-surface">
          Profile Completion
        </h3>
        <p className="text-2xl font-bold text-primary tabular-nums">{percent}%</p>
      </div>

      <div
        className="h-2 rounded-full bg-surface-container overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completion"
      >
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-sm text-on-surface-variant mt-4">
        {done
          ? "Your profile is complete."
          : `Add ${missing.length} more ${missing.length === 1 ? "detail" : "details"} to finish your profile.`}
      </p>

      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {complete.map((label) => (
          <li key={label} className="flex items-center gap-2 text-sm text-on-surface">
            <Check aria-hidden className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
            <span>{label}</span>
          </li>
        ))}
        {missing.map((label) => (
          <li
            key={label}
            className="flex items-center gap-2 text-sm text-on-surface-variant"
          >
            <X aria-hidden className="size-4 shrink-0 opacity-60" strokeWidth={2.5} />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
