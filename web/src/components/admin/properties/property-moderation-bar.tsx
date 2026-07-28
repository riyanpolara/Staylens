"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, BadgeCheck, Pencil, Play, Star, StarOff, Trash2, XCircle } from "lucide-react";
import {
  approveProperty,
  deleteProperty,
  rejectProperty,
  setPropertyFeatured,
  setPropertyStatus,
} from "@/lib/admin/property-actions";
import { PROPERTY_STATUSES } from "@/lib/admin/property-query";
import type { PropertyStatus } from "@/lib/admin/types";
import {
  ActionToast,
  ConfirmDialog,
  usePropertyAction,
} from "@/components/admin/properties/property-action-ui";

/**
 * The moderation controls on a single property. Same Server Actions as the row
 * menu — the status picker here is the escape hatch for the transitions the
 * shortcut buttons do not cover (back to draft, back to review).
 */
export function PropertyModerationBar({
  id,
  title,
  hostName,
  status,
  isFeatured,
  reviewCount,
}: {
  id: string;
  title: string;
  hostName: string;
  status: PropertyStatus;
  isFeatured: boolean;
  reviewCount: number;
}) {
  const router = useRouter();
  const { pending, feedback, confirm, setConfirm, run } = usePropertyAction();

  return (
    <div className="admin-moderation-bar">
      <Link className="btn btn-secondary" href={`/admin/properties/${id}/edit`}>
        <Pencil size={15} /> Edit
      </Link>

      <button
        type="button"
        className="btn btn-secondary"
        disabled={pending}
        onClick={() => run(() => setPropertyFeatured(id, !isFeatured))}
      >
        {isFeatured ? <StarOff size={15} /> : <Star size={15} />}
        {isFeatured ? "Unfeature" : "Feature"}
      </button>

      {status === "pending" && (
        <>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={() => run(() => approveProperty(id))}
          >
            <BadgeCheck size={15} /> Approve
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={pending}
            onClick={() =>
              setConfirm({
                kind: "reject",
                title: "Reject this listing?",
                body: `“${title}” stays out of search and AI recommendations. ${hostName} is told why, so give a reason.`,
                cta: "Reject listing",
                reason: true,
              })
            }
          >
            <XCircle size={15} /> Reject
          </button>
        </>
      )}

      {status === "live" ? (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() =>
            setConfirm({
              kind: "suspend",
              title: "Suspend this listing?",
              body: `“${title}” will be hidden from search and AI recommendations. Existing bookings stay intact and ${hostName} will be notified.`,
              cta: "Suspend listing",
            })
          }
        >
          <Ban size={15} /> Suspend
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() => run(() => setPropertyStatus(id, "live"))}
        >
          <Play size={15} /> Publish
        </button>
      )}

      <label className="admin-status-picker">
        <span className="sr-only">Listing status</span>
        <select
          className="btn btn-secondary admin-select"
          value={status}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value as PropertyStatus;
            if (next === status) return;
            if (next === "suspended") {
              setConfirm({
                kind: "suspend",
                title: "Suspend this listing?",
                body: `“${title}” will be hidden from search and AI recommendations. Existing bookings stay intact and ${hostName} will be notified.`,
                cta: "Suspend listing",
              });
              return;
            }
            run(() => setPropertyStatus(id, next));
          }}
        >
          {PROPERTY_STATUSES.map((option) => (
            <option key={option} value={option}>
              {option[0].toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="btn btn-secondary admin-btn-danger"
        style={{ marginInlineStart: "auto" }}
        disabled={pending}
        onClick={() =>
          setConfirm({
            kind: "delete",
            title: "Delete this listing?",
            body: `Deleting “${title}” removes it, its ${reviewCount.toLocaleString()} reviews and its media permanently. This cannot be undone.`,
            cta: "Delete permanently",
          })
        }
      >
        <Trash2 size={15} /> Delete
      </button>

      {confirm && (
        <ConfirmDialog
          spec={confirm}
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={(reason) => {
            if (confirm.kind === "delete") {
              run(() => deleteProperty(id), () => router.push("/admin/properties"));
            } else if (confirm.kind === "reject") {
              run(() => rejectProperty(id, reason));
            } else {
              run(() => setPropertyStatus(id, "suspended"));
            }
          }}
        />
      )}

      {feedback && <ActionToast result={feedback} />}
    </div>
  );
}
