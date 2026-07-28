import { CalendarX2 } from "lucide-react";
import { tagClassFor } from "@/lib/admin/types";
import {
  formatDateShort,
  formatDateTime,
  formatMoney,
  initialsOf,
  roleLabel,
  roleTagClass,
  type AdminUserDetail,
} from "@/lib/admin/user-query";
import { UserModalShell } from "@/components/admin/users/user-modal-shell";
import { UserDetailActions } from "@/components/admin/users/user-detail-actions";

/**
 * The user-details modal's contents — server-rendered, because everything it
 * shows comes from `admin_user_detail` and none of it is client state.
 *
 * Layout follows the handoff's detail pattern: identity + tags, the counters
 * that matter operationally, the profile facts, then the five most recent
 * bookings. The moderation controls are the one interactive island.
 */
export function UserDetailPanel({
  user,
  closeHref,
  isSelf,
}: {
  user: AdminUserDetail;
  closeHref: string;
  isSelf: boolean;
}) {
  const titleId = `user-${user.id}-title`;

  return (
    <UserModalShell closeHref={closeHref} titleId={titleId}>
      <header className="admin-us-head">
        <span className="admin-us-avatar admin-us-avatar-lg" aria-hidden>
          {user.avatar_url ? (
            /* See users-table.tsx: arbitrary remote host, tiny render size. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" />
          ) : (
            initialsOf(user.name, user.email)
          )}
        </span>
        <div className="admin-us-head-text">
          <h2 className="admin-us-title" id={titleId}>
            {user.name}
          </h2>
          <p className="admin-us-subtitle">{user.email ?? "No email on file"}</p>
          <div className="admin-us-tags">
            <span className={`tag ${roleTagClass(user.role)}`}>{roleLabel(user.role)}</span>
            <span className={`tag ${tagClassFor(user.status)}`}>{user.status}</span>
            {user.email_verified ? (
              <span className="tag tag-accent-2">Email verified</span>
            ) : (
              <span className="tag tag-accent">Email unverified</span>
            )}
            {isSelf && <span className="tag tag-outline">This is you</span>}
          </div>
        </div>
      </header>

      <dl className="admin-us-stats">
        <div className="admin-us-stat">
          <dt>Bookings</dt>
          <dd>{user.booking_count.toLocaleString()}</dd>
        </div>
        <div className="admin-us-stat">
          <dt>Upcoming</dt>
          <dd>{user.bookings_upcoming.toLocaleString()}</dd>
        </div>
        <div className="admin-us-stat">
          <dt>Cancelled</dt>
          <dd>{user.bookings_cancelled.toLocaleString()}</dd>
        </div>
        <div className="admin-us-stat">
          <dt>Spend</dt>
          <dd>{formatMoney(user.total_spend, user.home_currency ?? "USD")}</dd>
        </div>
        <div className="admin-us-stat">
          <dt>Favourites</dt>
          <dd>{user.favorites_count.toLocaleString()}</dd>
        </div>
        <div className="admin-us-stat">
          <dt>Saved</dt>
          <dd>{user.saved_count.toLocaleString()}</dd>
        </div>
      </dl>

      <dl className="admin-us-facts">
        <div>
          <dt>Country</dt>
          <dd>{user.country ?? "—"}</dd>
        </div>
        <div>
          <dt>Username</dt>
          <dd>{user.username ?? "—"}</dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>{formatDateShort(user.created_at)}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{formatDateTime(user.last_sign_in_at)}</dd>
        </div>
        <div>
          <dt>Birthday</dt>
          <dd>{user.birthday ? formatDateShort(user.birthday) : "—"}</dd>
        </div>
        <div>
          <dt>Currency</dt>
          <dd>{user.home_currency ?? "—"}</dd>
        </div>
        {user.banned_until && (
          <div>
            <dt>Blocked until</dt>
            <dd>{formatDateShort(user.banned_until)}</dd>
          </div>
        )}
        <div>
          <dt>User ID</dt>
          <dd style={{ fontSize: 12 }}>{user.id}</dd>
        </div>
      </dl>

      {user.bio && (
        <section>
          <h3 className="admin-us-section-title">About</h3>
          <p style={{ margin: "var(--space-2) 0 0", fontSize: 14 }}>{user.bio}</p>
        </section>
      )}

      <section>
        <h3 className="admin-us-section-title">Recent bookings</h3>
        {user.recent_bookings.length === 0 ? (
          <p
            className="text-muted"
            style={{ display: "flex", alignItems: "center", gap: 8, margin: "var(--space-2) 0 0", fontSize: 13 }}
          >
            <CalendarX2 size={15} aria-hidden />
            No bookings on this account yet.
          </p>
        ) : (
          <ul className="admin-us-bookings" style={{ marginBlockStart: "var(--space-2)" }}>
            {user.recent_bookings.map((b) => (
              <li key={b.id} className="admin-us-booking">
                <span className="admin-us-booking-main">
                  <strong title={b.property ?? undefined}>{b.property ?? "Listing removed"}</strong>
                  <span>
                    {b.reference ? `${b.reference} · ` : ""}
                    {formatDateShort(b.check_in)} → {formatDateShort(b.check_out)}
                    {b.nights ? ` · ${b.nights} night${b.nights === 1 ? "" : "s"}` : ""}
                  </span>
                </span>
                <span className="admin-us-booking-amount">
                  {formatMoney(b.total_price, b.currency ?? "USD")}
                </span>
                <span className={`tag ${tagClassFor(b.status)}`}>{b.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <UserDetailActions user={user} isSelf={isSelf} closeHref={closeHref} />
    </UserModalShell>
  );
}

/** Shown when `?user=` names an account that no longer exists. */
export function UserNotFound({ closeHref }: { closeHref: string }) {
  return (
    <UserModalShell closeHref={closeHref} titleId="user-missing-title">
      <div className="admin-empty" style={{ padding: "var(--space-6) 0" }}>
        <span className="admin-empty-icon admin-empty-icon-warn" aria-hidden>
          <CalendarX2 size={24} />
        </span>
        <h2 className="card-title" id="user-missing-title">
          Account not found
        </h2>
        <p className="text-muted">
          This account no longer exists — it may have just been deleted by another admin.
        </p>
      </div>
    </UserModalShell>
  );
}
