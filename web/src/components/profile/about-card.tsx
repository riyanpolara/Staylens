"use client";

import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { ABOUT_MAX, type ProfileFormValues } from "@/lib/profile-schema";

/** About Me editable textarea with a live character counter. */
export function AboutCard() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();
  const value = watch("about") ?? "";
  const over = value.length > ABOUT_MAX;
  const error = errors.about;

  return (
    <section className="md:col-span-2 bg-white rounded-[20px] p-6 md:p-10 shadow-tinted border border-outline-variant/10">
      <label htmlFor="about" className="font-display text-2xl font-semibold text-on-surface block mb-6">
        About Me
      </label>
      <textarea
        id="about"
        rows={5}
        aria-invalid={error ? true : undefined}
        aria-describedby="about-counter"
        placeholder="Share your story, your travel philosophy, or what you're looking for in your next staylens experience..."
        {...register("about")}
        className={cn(
          "w-full h-40 p-4 rounded-xl border-[1.5px] bg-surface-container-lowest text-base resize-none outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary",
          error || over ? "border-destructive/60" : "border-outline-variant/30",
        )}
      />
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-destructive">{error?.message}</p>
        <p
          id="about-counter"
          className={cn("text-xs tabular-nums", over ? "text-destructive" : "text-on-surface-variant")}
        >
          {value.length}/{ABOUT_MAX}
        </p>
      </div>
    </section>
  );
}
