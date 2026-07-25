"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CircleAlert } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { passwordError } from "@/lib/auth-validation";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pwErr = passwordError(password);
    if (pwErr) return setError(pwErr);
    if (password !== confirm) return setError("Passwords don't match.");

    start(async () => {
      const res = await resetPasswordAction(password);
      if (res.ok) {
        setDone(true);
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1200);
      } else {
        setError(res.error);
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="font-display text-3xl font-bold text-on-surface">Password updated</h1>
        <p className="text-on-surface-variant">Signing you in…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface tracking-tight mb-2">
          Set a new password
        </h1>
        <p className="text-on-surface-variant">Choose a strong password for your account.</p>
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
          id="password"
          type="password"
          label="New password"
          placeholder="At least 8 characters"
          hint="Use 8+ characters with a letter and a number."
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <AuthField
          id="confirm"
          type="password"
          label="Confirm password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="cta-gradient w-full h-14 rounded-[14px] text-white font-semibold flex items-center justify-center shadow-tinted disabled:opacity-70 transition-opacity"
        >
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
