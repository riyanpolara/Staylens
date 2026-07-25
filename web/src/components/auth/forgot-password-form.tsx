"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CircleAlert } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { isValidEmail } from "@/lib/auth-validation";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    start(async () => {
      const res = await forgotPasswordAction(email);
      if (res.ok) setSent(true);
      else setError(res.error);
    });
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="font-display text-3xl font-bold text-on-surface">Check your inbox</h1>
        <p className="text-on-surface-variant">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a link
          to reset your password.
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
          Reset your password
        </h1>
        <p className="text-on-surface-variant">
          Enter your email and we&apos;ll send you a link to set a new password.
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
        <AuthField
          id="email"
          type="email"
          label="Email"
          placeholder="example@staylens.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="cta-gradient w-full h-14 rounded-[14px] text-white font-semibold flex items-center justify-center shadow-tinted disabled:opacity-70 transition-opacity"
        >
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="text-center text-on-surface-variant">
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
