"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { postAuthDestination } from "@/lib/auth-redirect";
import { validateSignUp, isValidEmail, type SignUpInput } from "@/lib/auth-validation";

export type AuthResult =
  | { ok: true; needsEmailConfirmation?: boolean; redirectTo?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Absolute origin for links we email (confirmation, password reset).
 *
 * Prefers the explicitly configured site URL, but falls back to the real
 * request host instead of hard-coding localhost — otherwise a deployment that
 * forgets NEXT_PUBLIC_SITE_URL silently emails users links to their own
 * machine, which is unrecoverable from the user's side.
 */
async function siteUrl(): Promise<string> {
  const { siteUrl: configured } = getServerEnv();
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

/**
 * Register a new user via Supabase Auth. Password is hashed by Supabase (never
 * stored in plain text). first/last/birthday ride along as user metadata and
 * the `handle_new_user` trigger writes them into `profiles`. When email
 * confirmation is disabled the returned session cookie signs the user in
 * immediately; otherwise the UI prompts them to confirm.
 */
export async function signUpAction(input: SignUpInput): Promise<AuthResult> {
  const fieldErrors = validateSignUp(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/confirm`,
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        full_name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
        birthday: input.birthday,
      },
    },
  });

  if (error) {
    // Supabase surfaces raw service text ("email rate limit exceeded",
    // "Password should be at least..."). Translate it into something a user can
    // act on, and attach it to the offending field so the input turns red
    // instead of only showing a banner at the top of the form.
    const raw = `${error.message ?? ""} ${(error as { code?: string }).code ?? ""}`.toLowerCase();

    // Signup sends a confirmation email; the built-in mailer is rate limited.
    if (raw.includes("rate limit") || raw.includes("over_email_send") || raw.includes("429")) {
      return {
        ok: false,
        error:
          "Too many sign-up emails have been sent from this project in the last hour. " +
          "Wait a little and try again, or ask an admin to turn off email confirmation.",
      };
    }
    if (/registered|exists|already/i.test(raw)) {
      return {
        ok: false,
        error: "That email can’t be used. Try signing in instead.",
        fieldErrors: { email: "This email can’t be used." },
      };
    }
    if (raw.includes("password")) {
      return {
        ok: false,
        error: "That password was rejected.",
        fieldErrors: { password: error.message },
      };
    }
    if (raw.includes("email") && (raw.includes("invalid") || raw.includes("valid"))) {
      return {
        ok: false,
        error: "That email address was rejected.",
        fieldErrors: { email: "Enter a valid email address." },
      };
    }
    if (raw.includes("signups not allowed") || raw.includes("signup_disabled")) {
      return { ok: false, error: "New sign-ups are currently disabled for this site." };
    }
    return { ok: false, error: error.message };
  }

  // Supabase returns a user with an empty identities array when the email is
  // already taken (enumeration-safe). Treat that as a soft duplicate.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      ok: false,
      error: "That email can’t be used. Try signing in instead.",
      fieldErrors: { email: "This email can’t be used." },
    };
  }

  // The form sends the user to /login next; where they finally land is decided
  // there, from their role. No destination is computed here.
  return { ok: true, needsEmailConfirmation: !data.session };
}

/**
 * Sign in with email + password. Errors are intentionally generic so we never
 * reveal whether the email exists. On success, stamps `profiles.last_login`.
 */
export async function signInAction(
  email: string,
  password: string,
  /** optional `?redirect=` the user was sent to /login with */
  redirectTo?: string | null,
): Promise<AuthResult> {
  if (!isValidEmail(email) || !password) {
    return { ok: false, error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    if (/email not confirmed/i.test(error.message)) {
      return { ok: false, error: "Please confirm your email before signing in." };
    }
    // "Invalid login credentials" covers both wrong password and unknown email.
    return { ok: false, error: "Incorrect email or password." };
  }

  if (data.user) {
    // best-effort last_login stamp (RLS: user can update own profile)
    await supabase
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", data.user.id);
  }

  // Decide the landing page on the server, where the role can be trusted:
  // admins go straight to /admin, everyone else to the public site.
  return { ok: true, redirectTo: await postAuthDestination(redirectTo) };
}

/** Clear the session completely. */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/** Send a password-reset email (no-op-safe; never reveals if the email exists). */
export async function forgotPasswordAction(email: string): Promise<AuthResult> {
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${await siteUrl()}/reset-password` },
  );
  if (error) {
    // Still return ok to avoid leaking which emails exist.
    console.warn("[auth] reset email error:", error.message);
  }
  return { ok: true };
}

/**
 * Set a new password. Requires an active recovery session (the user arrived via
 * the reset link, which the /auth/confirm route exchanges for a session).
 */
export async function resetPasswordAction(password: string): Promise<AuthResult> {
  const { passwordError } = await import("@/lib/auth-validation");
  const pwErr = passwordError(password);
  if (pwErr) return { ok: false, error: pwErr };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
