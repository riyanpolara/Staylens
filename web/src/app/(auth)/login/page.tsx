import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in | Staylens" };

/**
 * Sign in.
 *
 * Renders unconditionally — it used to redirect whenever a session existed,
 * which meant tapping "Log in or sign up" while already signed in silently
 * jumped elsewhere without ever showing a form.
 *
 * The query string is read HERE and passed down as props. Reading it inside the
 * client form with `useSearchParams()` forced the page into a client-only
 * Suspense boundary, and with no other dynamic input the server emitted the
 * fallback instead of the form — i.e. a blank login page. Where a successful
 * sign-in lands is still decided by `signInAction`, from the account's role.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? null;

  return (
    <LoginForm
      redirect={one(sp.redirect)}
      linkExpired={one(sp.error) === "link_expired"}
      justRegistered={one(sp.registered) === "1"}
    />
  );
}
