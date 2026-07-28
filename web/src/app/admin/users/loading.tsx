import { UsersTableSkeleton } from "@/components/admin/users/users-states";
import "./users.css";

/** First paint of the segment. Subsequent search/filter/sort/page changes are
 *  covered by the Suspense boundary inside the page, which re-suspends on every
 *  query change. */
export default function Loading() {
  return (
    <section className="admin-rise">
      <div className="admin-toolbar">
        <span className="admin-skeleton admin-skeleton-control admin-us-search" />
        <span className="admin-skeleton admin-skeleton-control" style={{ width: 124 }} />
        <span className="admin-skeleton admin-skeleton-control" style={{ width: 138 }} />
      </div>
      <UsersTableSkeleton />
    </section>
  );
}
