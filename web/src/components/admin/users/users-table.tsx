import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { tagClassFor } from "@/lib/admin/types";
import {
  formatDateShort,
  initialsOf,
  roleLabel,
  roleTagClass,
  sortHref,
  usersHref,
  type AdminUserRow,
  type SortKey,
  type UserQuery,
} from "@/lib/admin/user-query";
import { UserRowActions } from "@/components/admin/users/user-row-actions";

/**
 * The users table. Server-rendered: sorting is a link, so it works with a cold
 * cache and without JavaScript, and the row menu is the only client component.
 */

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "User" },
  { key: "country", label: "Country" },
  { key: "role", label: "Role" },
  { key: "booking_count", label: "Bookings", numeric: true },
  { key: "created_at", label: "Joined", numeric: true },
  { key: "last_sign_in_at", label: "Last seen", numeric: true },
  { key: "status", label: "Status" },
];

function SortHeader({ column, query }: { column: (typeof COLUMNS)[number]; query: UserQuery }) {
  const active = query.sort === column.key;
  const Icon = !active ? ChevronsUpDown : query.dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={active ? (query.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        className="admin-th-sort"
        data-active={active || undefined}
        data-numeric={column.numeric || undefined}
        href={sortHref(query, column.key)}
        scroll={false}
      >
        {column.label}
        <Icon size={12} aria-hidden />
      </Link>
    </th>
  );
}

export function UsersTable({
  rows,
  query,
  adminId,
  page,
  pageCount,
}: {
  rows: AdminUserRow[];
  query: UserQuery;
  adminId: string;
  page: number;
  pageCount: number;
}) {
  return (
    <div className="card elev-sm admin-table-scroll">
      <table className="table">
        <caption className="sr-only">
          Users, page {page} of {pageCount}
        </caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <SortHeader key={column.key} column={column} query={query} />
            ))}
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => {
            const isSelf = u.id === adminId;
            const detailHref = usersHref(query, { user: u.id });

            return (
              <tr key={u.id}>
                <td>
                  <span className="admin-us-who">
                    <span className="admin-us-avatar" aria-hidden>
                      {u.avatar_url ? (
                        /* Plain <img>: avatar_url is arbitrary remote user
                           content, so next/image would need every host
                           allow-listed, and a 36px avatar gains nothing from
                           the optimizer. */
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt="" loading="lazy" />
                      ) : (
                        initialsOf(u.name, u.email)
                      )}
                    </span>
                    <span className="admin-us-name-cell">
                      <span className="admin-us-name">
                        <Link className="admin-us-name-link" href={detailHref} scroll={false}>
                          {u.name}
                        </Link>
                        {isSelf && <span className="tag tag-outline admin-us-you">You</span>}
                      </span>
                      <span className="admin-us-email" title={u.email ?? undefined}>
                        {u.email ?? "No email on file"}
                      </span>
                    </span>
                  </span>
                </td>
                <td>{u.country ?? "—"}</td>
                <td>
                  <span className={`tag ${roleTagClass(u.role)}`}>{roleLabel(u.role)}</span>
                </td>
                <td className="admin-num">{u.booking_count.toLocaleString()}</td>
                <td className="admin-num">{formatDateShort(u.created_at)}</td>
                <td className="admin-num">
                  {u.last_sign_in_at ? formatDateShort(u.last_sign_in_at) : "Never"}
                </td>
                <td>
                  <span className={`tag ${tagClassFor(u.status)}`}>{u.status}</span>
                </td>
                <td className="admin-actions-cell">
                  <UserRowActions user={u} query={query} isSelf={isSelf} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
