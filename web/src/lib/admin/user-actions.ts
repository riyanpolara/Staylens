"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAdmin } from "@/lib/admin/auth";
import {
  ASSIGNABLE_STATUSES,
  ROLE_LABEL,
  USER_ROLES,
  USER_STATUSES,
  type UserRole,
  type UserStatus,
} from "@/lib/admin/user-query";

/**
 * Mutations for the admin Users screen.
 *
 * A Server Action is a public POST endpoint, so every one of these re-checks
 * `checkAdmin()` first — rendering the row menu behind an admin-gated layout is
 * not a security boundary. The client sends an id plus the change it wants;
 * everything else is read from the database, never from the request.
 *
 * The `admin_user_*` functions (0014_admin_users.sql) are the second lock: each
 * re-checks `is_admin()`, refuses to let an admin target their own account, and
 * refuses to delete an account that has bookings. The duplicated checks here
 * exist to produce a better message without a database round trip — they are not
 * what makes the operation safe.
 */

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_ADMIN: ActionResult = {
  ok: false,
  message: "Your session is not an admin session. Sign in again.",
};

async function adminSession() {
  const check = await checkAdmin();
  return check.state === "admin" ? check.userId : null;
}

/** Postgres errors the admin can actually act on, in plain language. The
 *  functions raise with deliberate SQLSTATEs and already-user-facing messages,
 *  so those are passed through rather than rewritten. */
function describe(error: { code?: string; message?: string }, fallback: string): string {
  const message = error.message ?? "";
  switch (error.code) {
    // Raised by the functions: self-targeting, or not an admin.
    case "42501":
      return /forbidden/i.test(message)
        ? "Your account is not allowed to manage users."
        : message || fallback;
    // Bad role/status value, and the "has bookings" refusal.
    case "22023":
    case "23503":
    case "P0002":
      return message || fallback;
    case "42883":
      return "The users queries are not installed on this database. Apply migration 0014_admin_users.sql.";
    default:
      return message || fallback;
  }
}

/** Revalidate the list and, when given, the open detail modal. */
function refresh() {
  revalidatePath("/admin/users");
}

/* ── Change role ─────────────────────────────────────────────────────── */

export async function setUserRole(id: string, role: UserRole): Promise<ActionResult> {
  const adminId = await adminSession();
  if (!adminId) return NOT_ADMIN;

  if (!UUID_RE.test(id)) return { ok: false, message: "Unknown user." };
  if (!(USER_ROLES as readonly string[]).includes(role)) {
    return { ok: false, message: "Unknown role." };
  }
  if (id === adminId) {
    return { ok: false, message: "You cannot change your own role." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_user_set_role", { p_id: id, p_role: role });

  if (error) {
    return { ok: false, message: describe(error, "Could not change the role.") };
  }

  refresh();
  return { ok: true, message: `Role changed to ${ROLE_LABEL[role]}.` };
}

/* ── Suspend / ban / reactivate ──────────────────────────────────────── */

const STATUS_MESSAGE: Record<string, string> = {
  active: "Account reactivated — they can sign in again.",
  suspended: "Account suspended and signed out.",
  banned: "Account banned and signed out.",
  pending: "Account marked pending.",
};

/**
 * Sets the moderation status. The function also writes
 * `auth.users.banned_until` and drops live sessions, so a suspension takes
 * effect rather than only showing a different tag.
 */
export async function setUserStatus(id: string, status: UserStatus): Promise<ActionResult> {
  const adminId = await adminSession();
  if (!adminId) return NOT_ADMIN;

  if (!UUID_RE.test(id)) return { ok: false, message: "Unknown user." };
  if (!(USER_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, message: "Unknown status." };
  }
  // `pending` is derived from email confirmation, not an admin decision.
  if (!(ASSIGNABLE_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, message: "That status cannot be set by hand." };
  }
  if (id === adminId) {
    return { ok: false, message: "You cannot change your own status." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_user_set_status", {
    p_id: id,
    p_status: status,
  });

  if (error) {
    return { ok: false, message: describe(error, "Could not update the account.") };
  }

  refresh();
  return { ok: true, message: STATUS_MESSAGE[status] ?? "Account updated." };
}

/* ── Delete ──────────────────────────────────────────────────────────── */

/**
 * Permanent delete. The profile, favourites, saved lists and chat history
 * cascade with the auth record and reviews are anonymised; an account with
 * bookings is refused by the function (booking records are retained) and
 * surfaces as a "ban instead" message.
 */
export async function deleteUser(id: string): Promise<ActionResult> {
  const adminId = await adminSession();
  if (!adminId) return NOT_ADMIN;

  if (!UUID_RE.test(id)) return { ok: false, message: "Unknown user." };
  if (id === adminId) {
    return { ok: false, message: "You cannot delete your own account." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_user_delete", { p_id: id });

  if (error) {
    return { ok: false, message: describe(error, "Could not delete the account.") };
  }

  refresh();
  return { ok: true, message: "Account deleted." };
}
