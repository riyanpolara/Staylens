import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { MIN_AGE } from "@/lib/auth-validation";

export const metadata: Metadata = { title: "Create your account | Staylens" };

/**
 * Create Account.
 *
 * Deliberately does NOT redirect when a session already exists. Bouncing a
 * signed-in visitor away made "Log in or sign up" look broken — the page never
 * appeared, it just jumped somewhere else. Anyone can open this page; creating
 * an account simply replaces the current session.
 */
export default function SignupPage() {
  // Latest date that still satisfies the 18+ rule. Computed on the server and
  // passed down so the date picker is constrained in the very first HTML —
  // no client effect, no extra render, no hydration mismatch.
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE);

  return <SignupForm maxBirthday={cutoff.toISOString().slice(0, 10)} />;
}
