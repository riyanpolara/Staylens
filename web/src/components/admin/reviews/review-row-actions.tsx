"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Eye, MoreVertical, RotateCcw, Trash2, X } from "lucide-react";
import { setReviewStatus } from "@/lib/admin/review-actions";
import {
  ACTION_LABEL,
  actionsFor,
  reviewsHref,
  type AdminReviewRow,
  type ReviewAction,
  type ReviewQuery,
} from "@/lib/admin/review-query";
import {
  ActionToast,
  ConfirmDialog,
  useUserAction,
} from "@/components/admin/users/user-action-ui";

/**
 * Per-row menu: view review · approve · reject · restore · delete.
 *
 * The action list comes from `actionsFor(status)` rather than being fixed, so a
 * published review is not offered "Approve" and one that was never taken down is
 * not offered "Restore" — a menu full of no-ops is worse than a short one.
 *
 * Reject and delete go through the confirm dialog, whose copy states what
 * happens (the review disappears from the property page). Approve and restore
 * are non-destructive and apply immediately.
 *
 * The dialog, toast and action hook are the ones the Users screen uses; their
 * `ActionResult` is structurally identical, so there is nothing to duplicate.
 */

const ICON: Record<ReviewAction, typeof Check> = {
  approve: Check,
  reject: X,
  restore: RotateCcw,
  delete: Trash2,
};

/** Which verbs need a confirmation, and what the copy should say. */
const CONFIRM: Partial<Record<ReviewAction, { title: string; body: string }>> = {
  reject: {
    title: "Reject this review?",
    body:
      "It will be hidden from the property page immediately. You can restore it later from the Rejected filter.",
  },
  delete: {
    title: "Delete this review?",
    body:
      "It will be hidden from the property page and moved to Deleted. Nothing is permanently erased — you can restore it from the Deleted filter.",
  },
};

export function ReviewRowActions({
  review,
  query,
}: {
  review: AdminReviewRow;
  query: ReviewQuery;
}) {
  const [open, setOpen] = useState(false);
  const { pending, feedback, confirm, setConfirm, run } = useUserAction();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function act(action: ReviewAction) {
    setOpen(false);
    const spec = CONFIRM[action];
    if (spec) {
      setConfirm({
        title: spec.title,
        body: spec.body,
        cta: ACTION_LABEL[action],
        run: () => setReviewStatus(review.id, action),
      });
      return;
    }
    run(() => setReviewStatus(review.id, action));
  }

  return (
    <div className="admin-row-actions" ref={wrapRef}>
      <button
        type="button"
        className="btn btn-secondary btn-icon"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for the review by ${review.reviewer_name}`}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={15} aria-hidden />
      </button>

      {open && (
        <div className="admin-menu" role="menu">
          <Link
            className="admin-menu-item"
            role="menuitem"
            href={reviewsHref(query, { review: review.id })}
            scroll={false}
            onClick={() => setOpen(false)}
          >
            <Eye size={14} aria-hidden />
            View review
          </Link>

          {actionsFor(review.status).map((action) => {
            const Icon = ICON[action];
            return (
              <button
                key={action}
                type="button"
                className="admin-menu-item"
                role="menuitem"
                data-danger={action === "delete" || action === "reject" || undefined}
                onClick={() => act(action)}
              >
                <Icon size={14} aria-hidden />
                {ACTION_LABEL[action]}
              </button>
            );
          })}
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          spec={confirm}
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => run(confirm.run)}
        />
      )}

      {feedback && <ActionToast result={feedback} />}
    </div>
  );
}
