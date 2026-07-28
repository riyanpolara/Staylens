"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ban, CircleSlash, Eye, MoreVertical, Trash2, UserCheck, UserCog } from "lucide-react";
import { deleteUser, setUserRole, setUserStatus } from "@/lib/admin/user-actions";
import {
  ROLE_LABEL,
  USER_ROLES,
  type AdminUserRow,
  type UserQuery,
  usersHref,
} from "@/lib/admin/user-query";
import {
  ActionToast,
  ConfirmDialog,
  useUserAction,
} from "@/components/admin/users/user-action-ui";

/**
 * Per-row menu: view profile · change role · suspend/ban/reactivate · delete.
 *
 * Destructive actions always go through the confirm dialog, whose copy states
 * what is lost (handoff spec, interaction rules). The menu closes on outside
 * click and on Escape.
 *
 * `isSelf` disables everything but "View profile": an admin cannot demote,
 * suspend or delete their own account — the database refuses it too, but the
 * disabled menu explains why instead of failing after the click.
 */
export function UserRowActions({
  user,
  query,
  isSelf,
}: {
  user: AdminUserRow;
  query: UserQuery;
  isSelf: boolean;
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

  const act = (work: Parameters<typeof run>[0]) => {
    setOpen(false);
    run(work);
  };

  const ask = (spec: Parameters<typeof setConfirm>[0]) => {
    setOpen(false);
    setConfirm(spec);
  };

  const blocked = user.status === "suspended" || user.status === "banned";

  return (
    <div className="admin-row-actions" ref={wrapRef}>
      <button
        type="button"
        className="btn btn-secondary btn-icon"
        aria-label={`Actions for ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertical size={16} aria-hidden />
      </button>

      {open && (
        <div className="card elev-lg admin-menu" role="menu">
          <Link
            className="admin-menu-item"
            role="menuitem"
            href={usersHref(query, { user: user.id })}
            scroll={false}
            onClick={() => setOpen(false)}
          >
            <Eye size={14} aria-hidden /> View profile
          </Link>

          <hr className="admin-us-menu-sep" />
          <p className="admin-us-menu-label">Change role</p>
          {USER_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              role="menuitem"
              className="admin-menu-item"
              data-current={user.role === role || undefined}
              disabled={isSelf || user.role === role}
              onClick={() =>
                ask({
                  title: `Make ${user.name} ${ROLE_LABEL[role].toLowerCase() === "admin" ? "an admin" : `a ${ROLE_LABEL[role].toLowerCase()}`}?`,
                  body:
                    role === "admin"
                      ? `${user.name} will get full access to this dashboard, including every user account, listing and booking.`
                      : role === "host"
                        ? `${user.name} will be able to create and manage listings.`
                        : `${user.name} loses host and admin access. Their existing listings stay in the catalog.`,
                  cta: `Make ${ROLE_LABEL[role]}`,
                  run: () => setUserRole(user.id, role),
                })
              }
            >
              <UserCog size={14} aria-hidden /> {ROLE_LABEL[role]}
            </button>
          ))}

          <hr className="admin-us-menu-sep" />

          {blocked ? (
            <button
              type="button"
              role="menuitem"
              className="admin-menu-item"
              disabled={isSelf}
              onClick={() => act(() => setUserStatus(user.id, "active"))}
            >
              <UserCheck size={14} aria-hidden /> Reactivate
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="admin-menu-item admin-menu-item-warn"
              disabled={isSelf}
              onClick={() =>
                ask({
                  title: `Suspend ${user.name}?`,
                  body: `They keep their account and their ${user.booking_count.toLocaleString()} booking(s), but are signed out immediately and cannot sign in, book or host until an admin restores access.`,
                  cta: "Suspend account",
                  run: () => setUserStatus(user.id, "suspended"),
                })
              }
            >
              <CircleSlash size={14} aria-hidden /> Suspend
            </button>
          )}

          {user.status !== "banned" && (
            <button
              type="button"
              role="menuitem"
              className="admin-menu-item admin-menu-item-warn"
              disabled={isSelf}
              onClick={() =>
                ask({
                  title: `Ban ${user.name}?`,
                  body: `A ban signs them out and blocks sign-in indefinitely. Their bookings and reviews are kept. Use this instead of deleting when the account has history worth retaining.`,
                  cta: "Ban user",
                  run: () => setUserStatus(user.id, "banned"),
                })
              }
            >
              <Ban size={14} aria-hidden /> Ban
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            className="admin-menu-item admin-menu-item-warn"
            disabled={isSelf}
            onClick={() =>
              ask({
                title: `Delete ${user.name}?`,
                body:
                  user.booking_count > 0
                    ? `This account has ${user.booking_count.toLocaleString()} booking(s), so it cannot be deleted — booking records are retained. Ban it instead.`
                    : `This permanently removes the account, its profile, saved lists and chat history. Reviews they wrote stay but become anonymous. This cannot be undone.`,
                cta: "Delete permanently",
                run: () => deleteUser(user.id),
              })
            }
          >
            <Trash2 size={14} aria-hidden /> Delete
          </button>
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
