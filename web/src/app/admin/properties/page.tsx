import { Suspense } from "react";
import { fetchProperties } from "@/lib/admin/properties";
import {
  isPropertyQueryFiltered,
  parsePropertyQuery,
  propertyQueryString,
  type PropertyQuery,
} from "@/lib/admin/property-query";
import { PropertiesToolbar } from "@/components/admin/properties/properties-toolbar";
import { PropertiesTable } from "@/components/admin/properties/properties-table";
import { PropertiesPagination } from "@/components/admin/properties/properties-pagination";
import {
  PropertiesEmpty,
  PropertiesError,
  PropertiesTableSkeleton,
} from "@/components/admin/properties/properties-states";

export const metadata = { title: "Properties" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = parsePropertyQuery(await searchParams);

  return (
    <section className="admin-rise">
      {/* Outside the boundary: the filters stay usable while results load. */}
      <PropertiesToolbar query={query} />

      {/* Keyed on the query so every search / filter / sort / page change
          re-suspends and shows the skeleton instead of stale rows. */}
      <Suspense key={`rows${propertyQueryString(query)}`} fallback={<PropertiesTableSkeleton />}>
        <PropertiesResults query={query} />
      </Suspense>
    </section>
  );
}

async function PropertiesResults({ query }: { query: PropertyQuery }) {
  const result = await fetchProperties(query);

  if (!result.ok) return <PropertiesError message={result.message} />;

  const { rows, total, page, pageCount } = result.data;
  if (rows.length === 0) return <PropertiesEmpty filtered={isPropertyQueryFiltered(query)} />;

  return (
    <>
      <PropertiesTable rows={rows} query={query} />
      <PropertiesPagination query={query} page={page} pageCount={pageCount} total={total} />
    </>
  );
}
