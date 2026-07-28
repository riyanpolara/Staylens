"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CircleSlash, Trash2, UserCheck } from "lucide-react";
import { deleteUser, setUserRole, setUserStatus } from "@/lib/admin/user-actions";
import {
  ROLE_LABEL,
  USER_ROLES,
  type AdminUserDetail,
  type UserRole,
} from "@/lib/admin/user-query";
import {
  ActionToast,
  ConfirmDialog,
  useUserAction,
} from "@/components/admin/users/user-action-ui";

/**
 * Moderation controls in the details modal: role picker plus
 * suspend / ban / reactivate / delete.
 *
 * The same Server Actions the row menu calls, so there is one implementation of
 * each rule. On a successful delete the modal closes itself — the account it was
 * describing no longer exists.
 */
export function UserDetailActions({
  user,
  isSelf,
  closeHref,
}: {
  user: AdminUserDetail;
  isSelf: boolean;
  closeHref: string;
}) {
  const router = useRouter();
  const { pending, feedback, confirm, setConfirm, run } = useUserAction();

  /**
   * What the role picker is showing.
   *
   * Held in state rather than driven straight off `user.role`: choosing a role
   * only opens a confirm dialog, so on cancel the select has to be put back. A
   * `value={user.role}` alone would not do it — React would see an unchanged
   * value, skip the DOM write, and leave the select displaying a role the
   * account does not have.
   */
  const [draftRole, setDraftRole] = useState<UserRole>(user.role as UserRole);

  const blocked = user.status === "suspended" || user.status === "banned";
  const closeAfter = () => router.push(closeHref, { scroll: false });

  const cancelConfirm = () => {
    setDraftRole(user.role as UserRole);
    setConfirm(null);
  };

  return (
    <footer className="admin-us-panel-foot">
      {isSelf ? (
        <p className="admin-us-foot-note">
          This is your own account — role, status and deletion are disabled here.
        </p>
      ) : (
        <label className="admin-us-per-page admin-us-foot-note" style={{ marginInlineEnd: "auto" }}>
          Role
          <select
            className="btn btn-secondary admin-select"
            aria-label="Change role"
            value={draftRole}
            disabled={pending}
            onChange={(event) => {
              const role = event.target.value as UserRole;
              setDraftRole(role);
              setConfirm({
                title: `Change role to ${ROLE_LABEL[role]}?`,
                body:
                  role === "admin"
                    ? `${user.name} will get full access to this dashboard, including every user account, listing and booking.`
                    : role === "host"
                      ? `${user.name} will be able to create and manage listings.`
                      : `${user.name} loses host and admin access. Their existing listings stay in the catalog.`,
                cta: `Make ${ROLE_LABEL[role]}`,
                run: () => setUserRole(user.id, role),
              });
            }}
          >
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
        </label>
      )}

      {blocked ? (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={isSelf || pending}
          onClick={() => run(() => setUserStatus(user.id, "active"))}
        >
          <UserCheck size={15} aria-hidden /> Reactivate
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-secondary admin-btn-danger"
          disabled={isSelf || pending}
          onClick={() =>
            setConfirm({
              title: `Suspend ${user.name}?`,
              body: `They keep their account and their ${user.booking_count.toLocaleString()} booking(s), but are signed out immediately and cannot sign in, book or host until an admin restores access.`,
              cta: "Suspend account",
              run: () => setUserStatus(user.id, "suspended"),
            })
          }
        >
          <CircleSlash size={15} aria-hidden /> Suspend
        </button>
      )}

      {user.status !== "banned" && (
        <button
          type="button"
          className="btn btn-secondary admin-btn-danger"
          disabled={isSelf || pending}
          onClick={() =>
            setConfirm({
              title: `Ban ${user.name}?`,
              body: `A ban signs them out and blocks sign-in indefinitely. Their bookings and reviews are kept. Use this instead of deleting when the account has history worth retaining.`,
              cta: "Ban user",
              run: () => setUserStatus(user.id, "banned"),
            })
          }
        >
          <Ban size={15} aria-hidden /> Ban
        </button>
      )}

      <button
        type="button"
        className="btn btn-secondary admin-btn-danger"
        disabled={isSelf || pending}
        onClick={() =>
          setConfirm({
            title: `Delete ${user.name}?`,
            body:
              user.booking_count > 0
                ? `This account has ${user.booking_count.toLocaleString()} booking(s), so it cannot be deleted — booking records are retained. Ban it instead.`
                : `This permanently removes the account, its profile, saved lists and chat history. Reviews they wrote stay but become anonymous. This cannot be undone.`,
            cta: "Delete permanently",
            run: () => deleteUser(user.id),
            closeOnSuccess: true,
          })
        }
      >
        <Trash2 size={15} aria-hidden /> Delete
      </button>

      {confirm && (
        <ConfirmDialog
          spec={confirm}
          pending={pending}
          onCancel={cancelConfirm}
          onConfirm={() => run(confirm.run, confirm.closeOnSuccess ? closeAfter : undefined)}
        />
      )}

      {feedback && <ActionToast result={feedback} />}
    </footer>
  );
}
