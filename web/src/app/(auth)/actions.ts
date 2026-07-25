"use server";

import { createClient } from "@/lib/supabase/server";
import { validateSignUp, isValidEmail, type SignUpInput } from "@/lib/auth-validation";

export type AuthResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
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
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        full_name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
        birthday: input.birthday,
      },
    },
  });

  if (error) {
    // Generic message for "already registered" to avoid account enumeration.
    if (/registered|exists/i.test(error.message)) {
      return { ok: false, error: "That email can’t be used. Try signing in instead." };
    }
    return { ok: false, error: error.message };
  }

  // Supabase returns a user with an empty identities array when the email is
  // already taken (enumeration-safe). Treat that as a soft duplicate.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, error: "That email can’t be used. Try signing in instead." };
  }

  const needsEmailConfirmation = !data.session;
  return { ok: true, needsEmailConfirmation };
}

/**
 * Sign in with email + password. Errors are intentionally generic so we never
 * reveal whether the email exists. On success, stamps `profiles.last_login`.
 */
export async function signInAction(
  email: string,
  password: string,
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

  return { ok: true };
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
    { redirectTo: `${siteUrl()}/reset-password` },
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
