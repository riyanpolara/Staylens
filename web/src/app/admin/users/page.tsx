import { Suspense } from "react";
import { checkAdmin } from "@/lib/admin/auth";
import { getUserDetail, getUsers } from "@/lib/admin/users";
import {
  hasActiveFilters,
  parseOpenUserId,
  parseUserQuery,
  usersHref,
  type SearchParams,
  type UserQuery,
} from "@/lib/admin/user-query";
import { UsersToolbar } from "@/components/admin/users/users-toolbar";
import { UsersTable } from "@/components/admin/users/users-table";
import { UsersPagination } from "@/components/admin/users/users-pagination";
import {
  NoUsersMatch,
  NoUsersYet,
  UsersError,
  UsersTableSkeleton,
} from "@/components/admin/users/users-states";
import {
  UserDetailPanel,
  UserNotFound,
} from "@/components/admin/users/user-detail-panel";
import "./users.css";

/**
 * Users — account management.
 *
 * A Server Component that reads its entire state from the URL and answers it
 * with one `admin_users_list()` call: search, role/status filters, sort, page
 * and page size are all resolved in Postgres, so a 41k-row table never reaches
 * the client to be counted. `?user=<id>` additionally server-renders the details
 * modal, which keeps a profile linkable and back-button-correct.
 */

export const metadata = { title: "Users" };

/** Filters and paging are request-time state; there is nothing to prerender. */
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const query = parseUserQuery(sp);
  const openId = parseOpenUserId(sp);

  return (
    <section className="admin-rise">
      {/* Outside the boundary: the filters stay usable while results load. */}
      <UsersToolbar query={query} />

      {/* Keyed on the list state so every search / filter / sort / page change
          re-suspends and shows the skeleton instead of stale rows. `?user=` is
          deliberately NOT in the key: opening a profile must not blank the table
          behind it — the boundary re-renders in place and the modal streams in. */}
      <Suspense key={usersHref(query)} fallback={<UsersTableSkeleton rows={query.pageSize} />}>
        <UsersResults query={query} openId={openId} />
      </Suspense>
    </section>
  );
}

async function UsersResults({
  query,
  openId,
}: {
  query: UserQuery;
  openId: string | null;
}) {
  // The admin's own id decides which rows may not be moderated. Fetched
  // alongside the data rather than passed down from the layout, because a Server
  // Component cannot read another one's state.
  const [check, list, detail] = await Promise.all([
    checkAdmin(),
    getUsers(query),
    openId ? getUserDetail(openId) : Promise.resolve(null),
  ]);

  if (!list.ok) return <UsersError reason={list.reason} message={list.message} />;

  const adminId = check.state === "admin" ? check.userId : "";
  const { rows, total, page, pageCount, pageSize } = list.data;
  // Same view, minus `?user=` — `usersHref` never carries the open modal over.
  const closeHref = usersHref(query);

  return (
    <>
      {rows.length === 0 ? (
        hasActiveFilters(query) ? (
          <NoUsersMatch clearHref="/admin/users" />
        ) : (
          <NoUsersYet />
        )
      ) : (
        <>
          <UsersTable
            rows={rows}
            query={query}
            adminId={adminId}
            page={page}
            pageCount={pageCount}
          />
          <UsersPagination
            query={query}
            page={page}
            pageCount={pageCount}
            total={total}
            pageSize={pageSize}
            rowsOnPage={rows.length}
          />
        </>
      )}

      {openId &&
        detail &&
        (detail.ok && detail.data ? (
          <UserDetailPanel
            user={detail.data}
            closeHref={closeHref}
            isSelf={detail.data.id === adminId}
          />
        ) : (
          <UserNotFound closeHref={closeHref} />
        ))}
    </>
  );
}
