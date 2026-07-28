"use client";

import { useEffect, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/admin/user-actions";

/**
 * Shared moderation UI for the Users screen: the confirm dialog, the result
 * toast, and the small runner that ties a Server Action to both.
 *
 * The row menu and the details modal drive the same actions, so they share this
 * rather than each growing its own dialog.
 */

export type ConfirmSpec = {
  title: string;
  /** Copy must state what is lost — handoff spec, interaction rules. */
  body: string;
  cta: string;
  run: () => Promise<ActionResult>;
  /** Set when the action destroys what the surrounding view describes, so the
   *  details modal closes itself rather than showing a deleted account. */
  closeOnSuccess?: boolean;
};

export function useUserAction() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(id);
  }, [feedback]);

  /** `after` runs only when the action reported success (e.g. close the modal). */
  const run = (work: () => Promise<ActionResult>, after?: () => void) =>
    startTransition(async () => {
      const result = await work();
      setFeedback(result);
      setConfirm(null);
      if (result.ok) after?.();
    });

  return { pending, feedback, setFeedback, confirm, setConfirm, run };
}

export function ConfirmDialog({
  spec,
  pending,
  onCancel,
  onConfirm,
}: {
  spec: ConfirmSpec;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        // The details modal also closes on Escape; without this the confirm and
        // the modal behind it would both close on one keypress.
        event.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel, pending]);

  return (
    <div className="dialog-backdrop admin-dialog-layer" role="presentation">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={spec.title}>
        <h2 className="dialog-title">{spec.title}</h2>
        <p className="dialog-body">{spec.body}</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={onConfirm}>
            {pending ? "Working…" : spec.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ActionToast({ result }: { result: ActionResult }) {
  return (
    <output className={`card elev-lg admin-toast ${result.ok ? "" : "admin-toast-error"}`}>
      {result.message}
    </output>
  );
}
