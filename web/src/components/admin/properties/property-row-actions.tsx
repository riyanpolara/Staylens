"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  Ban,
  BadgeCheck,
  Eye,
  MoreVertical,
  Pencil,
  Play,
  Star,
  StarOff,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  approveProperty,
  deleteProperty,
  rejectProperty,
  setPropertyFeatured,
  setPropertyStatus,
} from "@/lib/admin/property-actions";
import type { AdminPropertyRow } from "@/lib/admin/property-query";
import {
  ActionToast,
  ConfirmDialog,
  usePropertyAction,
} from "@/components/admin/properties/property-action-ui";

/**
 * Per-row menu: view · edit · feature · approve/reject · suspend/publish · delete.
 *
 * Destructive actions always go through the confirm dialog. The menu closes on
 * outside click and on Escape (handoff spec, interaction rules).
 */
export function PropertyRowActions({ property }: { property: AdminPropertyRow }) {
  const [open, setOpen] = useState(false);
  const { pending, feedback, confirm, setConfirm, run } = usePropertyAction();

  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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

  const act = (work: Parameters<typeof run>[0]) => {
    setOpen(false);
    run(work);
  };

  const ask = (spec: Parameters<typeof setConfirm>[0]) => {
    setOpen(false);
    setConfirm(spec);
  };

  return (
    <div className="admin-row-actions" ref={wrapRef}>
      <button
        type="button"
        className="btn btn-secondary btn-icon"
        aria-label={`Actions for ${property.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="card elev-lg admin-menu" id={menuId} role="menu">
          <Link className="admin-menu-item" role="menuitem" href={`/admin/properties/${property.id}`}>
            <Eye size={14} /> View
          </Link>
          <Link
            className="admin-menu-item"
            role="menuitem"
            href={`/admin/properties/${property.id}/edit`}
          >
            <Pencil size={14} /> Edit
          </Link>

          <button
            type="button"
            role="menuitem"
            className="admin-menu-item"
            onClick={() => act(() => setPropertyFeatured(property.id, !property.is_featured))}
          >
            {property.is_featured ? <StarOff size={14} /> : <Star size={14} />}
            {property.is_featured ? "Unfeature" : "Feature"}
          </button>

          {property.status === "pending" && (
            <>
              <button
                type="button"
                role="menuitem"
                className="admin-menu-item"
                onClick={() => act(() => approveProperty(property.id))}
              >
                <BadgeCheck size={14} /> Approve
              </button>
              <button
                type="button"
                role="menuitem"
                className="admin-menu-item admin-menu-item-warn"
                onClick={() =>
                  ask({
                    kind: "reject",
                    title: "Reject this listing?",
                    body: `“${property.title}” stays out of search and AI recommendations. ${property.host.name} is told why, so give a reason.`,
                    cta: "Reject listing",
                    reason: true,
                  })
                }
              >
                <XCircle size={14} /> Reject
              </button>
            </>
          )}

          {property.status === "live" ? (
            <button
              type="button"
              role="menuitem"
              className="admin-menu-item admin-menu-item-warn"
              onClick={() =>
                ask({
                  kind: "suspend",
                  title: "Suspend this listing?",
                  body: `“${property.title}” will be hidden from search and AI recommendations. Existing bookings stay intact and ${property.host.name} will be notified.`,
                  cta: "Suspend listing",
                })
              }
            >
              <Ban size={14} /> Suspend
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="admin-menu-item"
              onClick={() => act(() => setPropertyStatus(property.id, "live"))}
            >
              <Play size={14} /> Publish
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            className="admin-menu-item admin-menu-item-warn"
            onClick={() =>
              ask({
                kind: "delete",
                title: "Delete this listing?",
                body: `Deleting “${property.title}” removes it, its ${property.review_count.toLocaleString()} reviews and its media permanently. This cannot be undone.`,
                cta: "Delete permanently",
              })
            }
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          spec={confirm}
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={(reason) => {
            if (confirm.kind === "delete") run(() => deleteProperty(property.id));
            else if (confirm.kind === "reject") run(() => rejectProperty(property.id, reason));
            else run(() => setPropertyStatus(property.id, "suspended"));
          }}
        />
      )}

      {feedback && <ActionToast result={feedback} />}
    </div>
  );
}
