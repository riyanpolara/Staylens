"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CircleAlert } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { signUpAction } from "@/app/(auth)/actions";
import { validateSignUp, MIN_AGE } from "@/lib/auth-validation";

/** Fields in visual order — used to focus the first one that fails. */
const FIELD_ORDER = ["firstName", "lastName", "email", "password", "birthday"] as const;

export function SignupForm() {
  const router = useRouter();
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    birthday: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [maxBirthday, setMaxBirthday] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();

  // Latest date that still satisfies the 18+ rule, so the picker can't offer an
  // under-age (or future) date. Set on the client to avoid a hydration mismatch.
  useEffect(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_AGE);
    setMaxBirthday(d.toISOString().slice(0, 10));
  }, []);

  function set(k: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = { ...values, [k]: e.target.value };
      setValues(next);
      // once they've tried to submit, keep errors live so fixing a field
      // clears its message (and the button stops feeling "stuck")
      if (submitted) {
        const errs = validateSignUp(next);
        setFieldErrors(errs);
        if (Object.keys(errs).length === 0) setError(null);
      }
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitted(true);
    const errs = validateSignUp(values);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Previously this returned silently — the button looked unresponsive.
      setError("Please fix the highlighted fields below before continuing.");
      const firstBad = FIELD_ORDER.find((k) => errs[k]);
      if (firstBad) {
        const el = document.getElementById(firstBad);
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    start(async () => {
      const res = await signUpAction(values);
      if (res.ok) {
        if (res.needsEmailConfirmation) {
          setConfirmSent(true);
        } else {
          // auto signed-in → home, refresh so the navbar shows the user
          router.push("/");
          router.refresh();
        }
      } else {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      }
    });
  }

  if (confirmSent) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="font-display text-3xl font-bold text-on-surface">Check your inbox</h1>
        <p className="text-on-surface-variant">
          We sent a confirmation link to <strong>{values.email}</strong>. Click it
          to finish creating your account.
        </p>
        <Link href="/login" className="inline-block text-primary font-semibold hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface tracking-tight mb-2">
          Finish signing up
        </h1>
        <p className="text-on-surface-variant">
          Join our community of nature-focused travelers and discover curated
          serene escapes.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-surface-container-lowest/90 backdrop-blur-sm shadow-tinted rounded-[20px] p-6 md:p-8 border border-outline-variant/20 space-y-5"
        noValidate
      >
        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5">
            <CircleAlert aria-hidden className="size-4 shrink-0 mt-0.5" />
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <AuthField
            id="firstName"
            label="First name"
            placeholder="John"
            autoComplete="given-name"
            value={values.firstName}
            onChange={set("firstName")}
            error={fieldErrors.firstName}
            required
          />
          <AuthField
            id="lastName"
            label="Last name"
            placeholder="Doe"
            autoComplete="family-name"
            value={values.lastName}
            onChange={set("lastName")}
            error={fieldErrors.lastName}
            required
          />
        </div>

        <AuthField
          id="email"
          type="email"
          label="Email"
          placeholder="example@staylens.com"
          hint="We'll email you trip confirmations and inspiration."
          autoComplete="email"
          value={values.email}
          onChange={set("email")}
          error={fieldErrors.email}
          required
        />

        <AuthField
          id="password"
          type="password"
          label="Password"
          placeholder="At least 8 characters"
          hint="Use 8+ characters with a letter and a number."
          autoComplete="new-password"
          value={values.password}
          onChange={set("password")}
          error={fieldErrors.password}
          required
        />

        <AuthField
          id="birthday"
          type="date"
          label="Birthday"
          max={maxBirthday}
          hint="To sign up, you need to be at least 18. Your birthday won't be shared with other people who use Staylens."
          value={values.birthday}
          onChange={set("birthday")}
          error={fieldErrors.birthday}
          required
        />

        <p className="text-[12px] text-on-surface-variant leading-relaxed">
          By selecting <span className="font-semibold">Agree and Continue</span>,
          I agree to Staylens&apos;s{" "}
          <a href="#" className="text-primary underline">Terms of Service</a>,{" "}
          <a href="#" className="text-primary underline">Payments Terms of Service</a>,
          and{" "}
          <a href="#" className="text-primary underline">Nondiscrimination Policy</a>{" "}
          and acknowledge the{" "}
          <a href="#" className="text-primary underline">Privacy Policy</a>.
        </p>

        {/* repeat the blocking reason next to the button the user just pressed */}
        {submitted && Object.keys(fieldErrors).length > 0 && (
          <p role="alert" className="text-sm font-medium text-destructive text-center">
            {Object.keys(fieldErrors).length} field
            {Object.keys(fieldErrors).length === 1 ? "" : "s"} above still need
            {Object.keys(fieldErrors).length === 1 ? "s" : ""} attention.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="cta-gradient w-full h-14 rounded-[14px] text-white font-semibold flex items-center justify-center shadow-tinted disabled:opacity-70 transition-opacity"
        >
          {pending ? "Creating account…" : "Agree and Continue"}
        </button>
      </form>

      <p className="text-center text-on-surface-variant">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
