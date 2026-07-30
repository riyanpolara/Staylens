import { NextResponse } from "next/server";
import { getUnreadMessageCount } from "@/lib/messages";
import { getUnreadNotificationCount } from "@/lib/notifications";

/**
 * Unread counts for the nav badges.
 *
 * One small request feeds both badges, fetched only when the menu is opened so
 * it costs nothing on pages the user never opens it on. Signed out returns
 * zeros rather than 401 — having no session is a normal state here.
 */
export async function GET() {
  const [messages, notifications] = await Promise.all([
    getUnreadMessageCount(),
    getUnreadNotificationCount(),
  ]);

  return NextResponse.json(
    { messages, notifications },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
