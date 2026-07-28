import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  type AdminUserDetail,
  type AdminUserRow,
  type UserQuery,
} from "@/lib/admin/user-query";

/**
 * Read side of the admin Users screen.
 *
 * Both reads go through admin-only `SECURITY DEFINER` functions
 * (`supabase/migrations/0014_admin_users.sql`) rather than PostgREST selects:
 * the list needs a per-user booking count, `auth.users.last_sign_in_at` and the
 * unpaginated total in one round trip, and PostgREST can do none of those. The
 * functions re-check `is_admin()` themselves, so the layout gate is not the only
 * thing standing between a caller and every user's email address.
 */

/** Distinguishes "the migration is missing" from "you are not allowed" from
 *  "the database is unreachable" — each needs different copy and a different
 *  action from the admin. */
export type FailureReason = "setup" | "forbidden" | "unavailable";

/** Reads never throw: the page renders an inline error card with a retry so the
 *  toolbar stays usable and the admin can change filters instead. */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; reason: FailureReason; message: string };

export type UsersPage = {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

type PgError = { message?: string; code?: string; details?: string; hint?: string };

function failure(error: PgError, context: string): {
  ok: false;
  reason: FailureReason;
  message: string;
} {
  console.error(`[admin/users] ${context} failed:`, error);

  const message = error.message ?? "";

  // The function is not in the database yet.
  if (error.code === "42883" || /could not find the function/i.test(message)) {
    return {
      ok: false,
      reason: "setup",
      message:
        "The users queries are not installed on this database. Apply supabase/migrations/0014_admin_users.sql, then reload.",
    };
  }
  // The function's own is_admin() guard.
  if (error.code === "42501") {
    return {
      ok: false,
      reason: "forbidden",
      message: "This session is not allowed to read user accounts.",
    };
  }
  return {
    ok: false,
    reason: "unavailable",
    message: message || "Could not reach the database.",
  };
}

/**
 * One page of users — filtered, sorted and counted entirely in Postgres.
 *
 * `total` comes back from the same call that produced the rows, so the pager can
 * never disagree with what it is paging over.
 */
export async function getUsers(query: UserQuery): Promise<Result<UsersPage>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_users_list", {
    p_search: query.search || undefined,
    p_role: query.role === "all" ? undefined : query.role,
    p_status: query.status === "all" ? undefined : query.status,
    p_sort: query.sort,
    p_dir: query.dir,
    p_page: query.page,
    p_page_size: query.pageSize,
  });

  if (error) return failure(error, "list");

  const payload = data as unknown as {
    rows?: AdminUserRow[];
    total?: number;
    page?: number;
    page_size?: number;
    page_count?: number;
  } | null;

  if (!payload) {
    return {
      ok: false,
      reason: "unavailable",
      message: "The users service returned nothing.",
    };
  }

  return {
    ok: true,
    data: {
      rows: payload.rows ?? [],
      total: payload.total ?? 0,
      page: payload.page ?? query.page,
      pageSize: payload.page_size ?? query.pageSize,
      pageCount: payload.page_count ?? 1,
    },
  };
}

/**
 * Detail for the user-details modal.
 *
 * Resolves to `null` when the id matches nobody — most likely deleted by another
 * admin between the list render and the click — which the modal reports as "no
 * longer exists" rather than as an error.
 */
export async function getUserDetail(id: string): Promise<Result<AdminUserDetail | null>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_user_detail", { p_id: id });

  if (error) return failure(error, "detail");
  return { ok: true, data: (data as unknown as AdminUserDetail | null) ?? null };
}
