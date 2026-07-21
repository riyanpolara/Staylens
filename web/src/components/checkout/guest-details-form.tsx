"use client";

import { isValidEmail } from "@/lib/validation";
import type { GuestDetails } from "@/components/checkout/checkout-types";

export function guestDetailsValid(g: GuestDetails): boolean {
  return g.firstName.trim().length > 0 && g.lastName.trim().length > 0 && isValidEmail(g.email);
}

/** Controlled guest contact form. Validity is surfaced to the parent. */
export function GuestDetailsForm({
  value,
  onChange,
  showErrors,
}: {
  value: GuestDetails;
  onChange: (next: GuestDetails) => void;
  showErrors: boolean;
}) {
  const set = (patch: Partial<GuestDetails>) => onChange({ ...value, ...patch });
  const emailBad = showErrors && value.email.length > 0 && !isValidEmail(value.email);

  return (
    <section aria-labelledby="guest-heading">
      <h2 id="guest-heading" className="font-display text-xl md:text-2xl font-semibold text-primary mb-1">
        Guest details
      </h2>
      <p className="text-on-surface-variant text-sm mb-5">
        Who should we send the booking confirmation to?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="First name"
          value={value.firstName}
          onChange={(v) => set({ firstName: v })}
          autoComplete="given-name"
          required
          invalid={showErrors && !value.firstName.trim()}
        />
        <Field
          label="Last name"
          value={value.lastName}
          onChange={(v) => set({ lastName: v })}
          autoComplete="family-name"
          required
          invalid={showErrors && !value.lastName.trim()}
        />
        <Field
          label="Email"
          type="email"
          value={value.email}
          onChange={(v) => set({ email: v })}
          autoComplete="email"
          required
          invalid={emailBad || (showErrors && !value.email.trim())}
          hint={emailBad ? "Enter a valid email address." : undefined}
          className="sm:col-span-2"
        />
        <Field
          label="Phone (optional)"
          type="tel"
          value={value.phone}
          onChange={(v) => set({ phone: v })}
          autoComplete="tel"
          className="sm:col-span-2"
        />
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
  invalid,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  invalid?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={invalid || undefined}
        className={[
          "w-full h-12 px-4 rounded-xl bg-surface border text-on-surface outline-none transition-colors",
          "focus:border-primary focus:ring-1 focus:ring-primary",
          invalid ? "border-destructive" : "border-outline-variant",
        ].join(" ")}
      />
      {hint && <span className="block text-xs text-destructive mt-1">{hint}</span>}
    </label>
  );
}
