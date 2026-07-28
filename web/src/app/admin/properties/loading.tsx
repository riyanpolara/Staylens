import { PropertiesTableSkeleton } from "@/components/admin/properties/properties-states";

/** First paint of the segment. Subsequent filter/sort/page changes are covered
 *  by the Suspense boundary inside the page, which re-suspends on query change. */
export default function Loading() {
  return (
    <section className="admin-rise">
      <div className="admin-toolbar">
        <span className="admin-skeleton admin-skeleton-control" style={{ width: 240 }} />
        <span className="admin-skeleton admin-skeleton-control" style={{ width: 132 }} />
        <span className="admin-skeleton admin-skeleton-control" style={{ width: 116 }} />
      </div>
      <PropertiesTableSkeleton />
    </section>
  );
}
