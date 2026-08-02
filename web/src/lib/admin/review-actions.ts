"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAdmin } from "@/lib/admin/auth";
import {
  ACTION_LABEL,
  REVIEW_ACTIONS,
  type ReviewAction,
} from "@/lib/admin/review-query";

/**
 * Mutations for the admin Reviews screen.
 *
 * A Server Action is a public POST endpoint, so every one of these re-checks
 * `checkAdmin()` first — rendering the row menu behind an admin-gated layout is
 * not a security boundary. The client sends an id plus the verb it wants;
 * everything else is read from the database, never from the request.
 *
 * `admin_review_set_status` (0022_reviews_admin.sql) is the second lock: it
 * re-checks `is_admin()` and validates the verb against a fixed set, raising
 * 22023 for anything else. The checks here exist to produce a better message
 * without a database round trip — they are not what makes the operation safe.
 */

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_ADMIN: ActionResult = {
  ok: false,
  message: "Your session is not an admin session. Sign in again.",
};

/** Past-tense confirmation for the toast, so the message names what happened. */
const DONE_LABEL: Record<ReviewAction, string> = {
  approve: "Review approved and published.",
  reject: "Review rejected and hidden from the property page.",
  restore: "Review restored and published again.",
  delete: "Review deleted. It can be restored from the Deleted filter.",
};

/** Postgres errors the admin can actually act on, in plain language. */
function describe(error: { code?: string; message?: string }, fallback: string): string {
  const message = error.message ?? "";
  switch (error.code) {
    case "42501":
      return /forbidden/i.test(message)
        ? "Your account is not allowed to moderate reviews."
        : message || fallback;
    // Unknown status verb — the function refuses rather than guessing.
    case "22023":
      return message || fallback;
    case "42883":
      return "The reviews queries are not installed on this database. Apply migration 0022_reviews_admin.sql.";
    default:
      return message || fallback;
  }
}

function refresh() {
  revalidatePath("/admin/reviews");
}

/**
 * Approve, reject, restore or delete a review.
 *
 * One entry point for all four because they are the same write with a different
 * target state; splitting them would mean four near-identical functions that
 * could drift apart. Delete is soft — it sets `deleted`, which is what makes
 * restore possible.
 */
export async function setReviewStatus(
  id: string,
  action: ReviewAction,
  note?: string,
): Promise<ActionResult> {
  const check = await checkAdmin();
  if (check.state !== "admin") return NOT_ADMIN;

  if (!UUID_RE.test(id)) {
    return { ok: false, message: "That review id is not valid." };
  }
  if (!(REVIEW_ACTIONS as readonly string[]).includes(action)) {
    return { ok: false, message: "That is not an action we can take on a review." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_review_set_status", {
    p_id: id,
    p_status: action,
    // An empty note leaves any previous one in place, so approving a review does
    // not erase why it was rejected last week.
    p_note: note?.trim() ? note.trim().slice(0, 1000) : undefined,
  });

  if (error) {
    return {
      ok: false,
      message: describe(error, `Could not ${ACTION_LABEL[action].toLowerCase()} that review.`),
    };
  }

  const result = data as unknown as { ok?: boolean; reason?: string } | null;
  if (!result?.ok) {
    if (result?.reason === "not_found") {
      return {
        ok: false,
        message: "That review no longer exists. It may have been removed already.",
      };
    }
    return { ok: false, message: `Could not ${ACTION_LABEL[action].toLowerCase()} that review.` };
  }

  refresh();
  return { ok: true, message: DONE_LABEL[action] };
}
