"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CircleAlert } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { signInAction } from "@/app/(auth)/actions";
import { isValidEmail } from "@/lib/auth-validation";

/**
 * Query-string state arrives as props from the server page rather than through
 * `useSearchParams()`, which would otherwise pull this form into a client-only
 * Suspense boundary and leave the server rendering an empty page.
 */
export function LoginForm({
  redirect = null,
  linkExpired = false,
  justRegistered = false,
}: {
  /** `?redirect=` — null when the user opened /login directly, so the server
   *  stays free to send admins to /admin. */
  redirect?: string | null;
  linkExpired?: boolean;
  justRegistered?: boolean;
}) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    linkExpired ? "That link has expired. Please sign in." : null,
  );
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // client-side shape checks (safe to be specific — no account info leaked)
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = "Email is required.";
    else if (!isValidEmail(email)) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Password is required.";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError("Please fix the highlighted fields below.");
      document.getElementById(errs.email ? "email" : "password")?.focus();
      return;
    }

    start(async () => {
      const res = await signInAction(email, password, redirect);
      if (res.ok) {
        // The server decides the destination — it can read the role, the
        // client can't. Admins land on /admin, everyone else on the site.
        router.replace(res.redirectTo ?? redirect ?? "/");
        router.refresh();
      } else {
        setError(res.error);
        // Outline both credential fields — we deliberately don't say *which*
        // one was wrong (that would leak whether the account exists).
        setFieldErrors({ email: " ", password: " " });
      }
    });
  }

  /** Clears the error state as soon as the user starts correcting a field. */
  function edit(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (error) setError(null);
      if (Object.keys(fieldErrors).length) setFieldErrors({});
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface tracking-tight mb-2">
          Welcome back
        </h1>
        <p className="text-on-surface-variant">
          Sign in to continue your journey to the world&apos;s most breathtaking
          nature escapes.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-surface-container-lowest/90 backdrop-blur-sm shadow-tinted rounded-[20px] p-6 md:p-8 border border-outline-variant/20 space-y-5"
        noValidate
      >
        {justRegistered && !error && (
          <p className="text-sm font-medium text-primary bg-primary-fixed/30 border border-primary/30 rounded-lg px-3 py-2.5">
            Account created. Sign in to continue.
          </p>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5">
            <CircleAlert aria-hidden className="size-4 shrink-0 mt-0.5" />
            {error}
          </p>
        )}

        <AuthField
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="example@staylens.com"
          hint="We'll email you trip confirmations and inspiration."
          autoComplete="email"
          value={email}
          onChange={edit(setEmail)}
          error={fieldErrors.email}
          required
        />
        <AuthField
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={edit(setPassword)}
          error={fieldErrors.password}
          required
        />

        <div className="flex justify-end -mt-2">
          <Link href="/forgot-password" className="text-sm text-primary font-semibold hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="cta-gradient w-full h-14 rounded-[14px] text-white font-semibold flex items-center justify-center shadow-tinted disabled:opacity-70 transition-opacity"
        >
          {pending ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="text-center text-on-surface-variant">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
