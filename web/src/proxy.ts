import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * Runs before every render: keeps the Supabase auth session fresh (refreshing
 * the cookie so server components see a valid session) and protects
 * authenticated routes. Next 16 renamed the `middleware` convention to `proxy`.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon and common static file extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
