"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Trash2, X } from "lucide-react";
import { setReviewStatus } from "@/lib/admin/review-actions";
import { ACTION_LABEL, actionsFor, type ReviewAction } from "@/lib/admin/review-query";
import {
  ActionToast,
  ConfirmDialog,
  useUserAction,
} from "@/components/admin/users/user-action-ui";

/**
 * Moderation buttons inside the detail panel.
 *
 * Offers an optional note, which the row menu does not: the panel is where an
 * admin has read the review and has a reason worth recording. The note is kept
 * on the row, so a later approval does not erase why it was rejected.
 *
 * Reject and delete confirm first; approve and restore apply immediately.
 * Deleting closes the panel, since it would otherwise sit there describing a
 * review the list no longer shows.
 */

const ICON: Record<ReviewAction, typeof Check> = {
  approve: Check,
  reject: X,
  restore: RotateCcw,
  delete: Trash2,
};

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

export function ReviewDetailActions({
  reviewId,
  status,
  closeHref,
}: {
  reviewId: string;
  status: string;
  closeHref: string;
}) {
  const router = useRouter();
  const { pending, feedback, confirm, setConfirm, run } = useUserAction();
  const [note, setNote] = useState("");

  const close = () => router.push(closeHref, { scroll: false });

  function act(action: ReviewAction) {
    const work = () => setReviewStatus(reviewId, action, note);
    const spec = CONFIRM[action];
    if (spec) {
      setConfirm({
        title: spec.title,
        body: spec.body,
        cta: ACTION_LABEL[action],
        run: work,
        closeOnSuccess: action === "delete",
      });
      return;
    }
    run(work);
  }

  const available = actionsFor(status);

  return (
    <footer className="admin-us-panel-foot admin-rv-foot">
      <label className="admin-rv-note">
        <span className="text-muted">Moderation note (optional)</span>
        <textarea
          className="input"
          rows={2}
          value={note}
          maxLength={1000}
          disabled={pending}
          placeholder="Why this decision — kept on the review for the next admin."
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <div className="admin-rv-action-row">
        {available.map((action) => {
          const Icon = ICON[action];
          const danger = action === "reject" || action === "delete";
          return (
            <button
              key={action}
              type="button"
              className={`btn ${danger ? "btn-secondary" : "btn-primary"}`}
              data-danger={danger || undefined}
              disabled={pending}
              onClick={() => act(action)}
            >
              <Icon size={14} aria-hidden />
              {ACTION_LABEL[action]}
            </button>
          );
        })}
      </div>

      {confirm && (
        <ConfirmDialog
          spec={confirm}
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => run(confirm.run, confirm.closeOnSuccess ? close : undefined)}
        />
      )}

      {feedback && <ActionToast result={feedback} />}
    </footer>
  );
}
