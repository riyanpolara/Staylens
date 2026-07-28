import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

/** Routes that require an authenticated session. */
const PROTECTED_PREFIXES = ["/profile", "/trips", "/account"];

/**
 * Dynamic routes that require a session. The reservation flow ends in a server
 * action that refuses anonymous users, so gating it here sends the guest to
 * login *before* they fill the form rather than after they press Pay.
 */
const PROTECTED_PATTERNS = [/^\/property\/[^/]+\/(?:checkout|payment)\/?$/];

/** Routes that additionally require profiles.role = 'admin'. */
const ADMIN_PREFIXES = ["/admin"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session cookie on every request (so server components
 * always see a valid session) and gates the protected routes. Adapted from the
 * official @supabase/ssr Next.js pattern; invoked from `proxy.ts`.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token with Supabase Auth — do not
  // trust getSession() alone in middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsAuth =
    matches(pathname, PROTECTED_PREFIXES) ||
    PROTECTED_PATTERNS.some((re) => re.test(pathname));
  const needsAdmin = matches(pathname, ADMIN_PREFIXES);

  // Not signed in → login, preserving where they were headed.
  if ((needsAuth || needsAdmin) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Drop the original params first — they are already carried inside
    // `redirect`, and leaving them duplicated makes the login URL confusing.
    const target = `${pathname}${request.nextUrl.search}`;
    url.search = "";
    url.searchParams.set("redirect", target);
    return NextResponse.redirect(url);
  }

  // Signed in but not an admin → 403. Turning non-admins away here means the
  // admin bundle is never even served to them. The layout repeats this check
  // server-side, so the route stays protected even if middleware is bypassed.
  if (needsAdmin && user) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    // Fail closed — a missing profile row or a failed lookup is not admin.
    if (error || data?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/403";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
