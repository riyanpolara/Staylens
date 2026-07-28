import "server-only";
import { checkAdmin } from "@/lib/admin/auth";

/**
 * Where a signed-in user belongs after authenticating.
 *
 * Admins land on the operations dashboard; everyone else on the public site.
 * Used by both the sign-in/sign-up actions and by the auth pages themselves,
 * so an already-signed-in admin who opens /login or /signup is sent to /admin
 * instead of being bounced to the marketing home page.
 *
 * An explicit `?redirect=` is honoured first, but only when it is a local path —
 * never an absolute URL, which would make this an open redirect.
 */
export async function postAuthDestination(requested?: string | null): Promise<string> {
  if (isSafeInternalPath(requested)) return requested!;

  const check = await checkAdmin();
  return check.state === "admin" ? "/admin" : "/";
}

/** Local, single-slash paths only — blocks `//evil.com` and `https://evil.com`. */
export function isSafeInternalPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}
