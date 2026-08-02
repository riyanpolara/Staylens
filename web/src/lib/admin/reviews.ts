import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminReviewDetail,
  AdminReviewRow,
  ReviewQuery,
  ReviewStatusCounts,
} from "@/lib/admin/review-query";

/**
 * Read side of the admin Reviews screen.
 *
 * All reads go through admin-only `SECURITY DEFINER` functions
 * (`supabase/migrations/0022_reviews_admin.sql`) rather than PostgREST selects,
 * for two reasons:
 *
 *  1. The list joins the reviewer (an imported name or a member profile), the
 *     property and that property's host, and needs the unpaginated total in the
 *     same round trip. PostgREST cannot sort or search on a joined column, and
 *     cannot return the total alongside a page.
 *
 *  2. A moderation queue must see rows the public policy hides. Rejected and
 *     deleted reviews are invisible to every ordinary select — deliberately, so
 *     that rejecting one actually removes it from the property page. Only the
 *     definer functions can read them, and each re-checks `is_admin()` itself.
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

export type ReviewsPage = {
  rows: AdminReviewRow[];
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
  console.error(`[admin/reviews] ${context} failed:`, error);

  const message = error.message ?? "";

  // The function is not in the database yet.
  if (error.code === "42883" || /could not find the function/i.test(message)) {
    return {
      ok: false,
      reason: "setup",
      message:
        "The reviews queries are not installed on this database. Apply supabase/migrations/0022_reviews_admin.sql, then reload.",
    };
  }
  // The function's own is_admin() guard.
  if (error.code === "42501") {
    return {
      ok: false,
      reason: "forbidden",
      message: "This session is not allowed to moderate reviews.",
    };
  }
  return {
    ok: false,
    reason: "unavailable",
    message: message || "Could not reach the database.",
  };
}

/**
 * One page of reviews — filtered, sorted and counted entirely in Postgres.
 *
 * `total` comes back from the same call that produced the rows, so the pager can
 * never disagree with what it is paging over.
 */
export async function getReviews(query: ReviewQuery): Promise<Result<ReviewsPage>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_reviews_list", {
    p_search: query.search || undefined,
    p_status: query.status === "all" ? undefined : query.status,
    p_rating: query.rating ?? undefined,
    p_source: query.source === "all" ? undefined : query.source,
    p_sort: query.sort,
    p_dir: query.dir,
    p_page: query.page,
    p_page_size: query.pageSize,
  });

  if (error) return failure(error, "list");

  const payload = data as unknown as {
    rows?: AdminReviewRow[];
    total?: number;
    page?: number;
    page_size?: number;
    page_count?: number;
  } | null;

  if (!payload) {
    return {
      ok: false,
      reason: "unavailable",
      message: "The reviews service returned nothing.",
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
 * Detail for the review panel: the full comment plus reviewer, property and host.
 *
 * Resolves to `null` when the id matches nothing — most likely purged by another
 * admin between the list render and the click — which the panel reports as "no
 * longer exists" rather than as an error.
 */
export async function getReviewDetail(
  id: string,
): Promise<Result<AdminReviewDetail | null>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_review_detail", { p_id: id });

  if (error) return failure(error, "detail");
  return { ok: true, data: (data as unknown as AdminReviewDetail | null) ?? null };
}

/**
 * Row counts per status, for the filter chips.
 *
 * Separate from the list so the chips show totals for the whole queue rather
 * than for the currently filtered view — an admin needs to know there are 12
 * pending reviews while looking at the published ones.
 */
export async function getReviewStatusCounts(): Promise<Result<ReviewStatusCounts>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_reviews_status_counts");
  if (error) return failure(error, "counts");

  const c = data as unknown as Partial<ReviewStatusCounts> | null;
  return {
    ok: true,
    data: {
      all: c?.all ?? 0,
      published: c?.published ?? 0,
      pending: c?.pending ?? 0,
      rejected: c?.rejected ?? 0,
      deleted: c?.deleted ?? 0,
    },
  };
}
