import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchPropertyDetail } from "@/lib/admin/properties";
import { PropertyEditForm } from "@/components/admin/properties/property-edit-form";
import { PropertiesError } from "@/components/admin/properties/properties-states";

export const metadata = { title: "Edit property" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminPropertyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const result = await fetchPropertyDetail(id);
  if (!result.ok) {
    return (
      <section className="admin-rise">
        <PropertiesError message={result.message} />
      </section>
    );
  }
  const property = result.data;
  if (!property) notFound();

  return (
    <section className="admin-rise admin-detail">
      <Link className="btn btn-ghost admin-back" href={`/admin/properties/${property.id}`}>
        <ArrowLeft size={15} /> Back to listing
      </Link>

      <header className="admin-detail-head">
        <div>
          <h2 className="admin-detail-title">Edit listing</h2>
          <p className="text-muted admin-detail-sub">
            {property.title} — status and featuring are managed from the listing page.
          </p>
        </div>
      </header>

      <PropertyEditForm property={property} />
    </section>
  );
}
