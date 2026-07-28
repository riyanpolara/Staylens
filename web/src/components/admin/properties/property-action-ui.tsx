"use client";

import { useEffect, useId, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/admin/property-actions";

/**
 * Shared moderation UI: the confirm dialog, the result toast, and the little
 * runner that ties a Server Action to both. The row menu and the property
 * detail screen drive the same actions, so they share this rather than each
 * growing their own dialog.
 */

export type ConfirmSpec = {
  kind: "suspend" | "delete" | "reject";
  title: string;
  /** Copy must state what is lost — handoff spec, interaction rules. */
  body: string;
  cta: string;
  /** Reject captures a reason that is stored on the listing. */
  reason?: boolean;
};

export function usePropertyAction() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(id);
  }, [feedback]);

  /** `after` runs only when the action reported success (e.g. navigate away). */
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
  onConfirm: (reason: string) => void;
}) {
  const id = useId();
  const [reason, setReason] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div className="dialog-backdrop admin-dialog-layer" role="presentation">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`}>
        <h2 className="dialog-title" id={`${id}-title`}>
          {spec.title}
        </h2>
        <p className="dialog-body">{spec.body}</p>

        {spec.reason && (
          <div className="field">
            <label htmlFor={`${id}-reason`}>Reason</label>
            <textarea
              id={`${id}-reason`}
              className="input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Photos do not match the address given."
            />
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={() => onConfirm(reason)}
          >
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
