import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/admin/ui";
import { ADMIN_NAV } from "@/components/admin/nav-items";

/**
 * Catch-all for the sidebar entries that are designed but not yet built
 * (handoff spec: "The other 8 sidebar entries route to an empty-state stub").
 *
 * Only the known stub paths are generated; `dynamicParams = false` makes any
 * other /admin/* URL a real 404 (without it the prerendered catch-all answers
 * unknown paths with a 200 carrying not-found markup).
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return ADMIN_NAV.filter((n) => !n.built).map((n) => ({
    slug: n.href.replace("/admin/", "").split("/"),
  }));
}
export default async function AdminStubPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const href = `/admin/${slug.join("/")}`;
  const item = ADMIN_NAV.find((n) => n.href === href);
  if (!item) notFound();

  return (
    <EmptyState
      icon={item.icon}
      title={`${item.label} is not built yet`}
      body="This screen is part of the design system but has no implementation yet. It will reuse the table, filter and chart patterns already in use on Properties and Bookings."
      action={
        <Link className="btn btn-secondary" href="/admin">
          Back to dashboard
        </Link>
      }
    />
  );
}
