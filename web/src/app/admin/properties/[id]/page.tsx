import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Star } from "lucide-react";
import { fetchPropertyDetail } from "@/lib/admin/properties";
import { tagClassFor } from "@/lib/admin/types";
import { MetricCard } from "@/components/admin/ui";
import { PropertyModerationBar } from "@/components/admin/properties/property-moderation-bar";
import { PropertiesError } from "@/components/admin/properties/properties-states";
import { cleanListingText } from "@/lib/listing-text";

export const metadata = { title: "Property" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function money(value: number | null, currency: string) {
  if (value === null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
}

const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default async function AdminPropertyPage({
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

  const cover = property.images[0];
  const facts: [string, string][] = [
    ["Room type", property.room_type ?? "—"],
    ["Property type", property.property_type ?? "—"],
    ["Sleeps", property.accommodates?.toString() ?? "—"],
    ["Bedrooms", property.bedrooms?.toString() ?? "—"],
    ["Beds", property.beds?.toString() ?? "—"],
    ["Bathrooms", property.bathrooms?.toString() ?? "—"],
    ["Cleaning fee", money(property.cleaning_fee, property.currency)],
    ["Security deposit", money(property.security_deposit, property.currency)],
    ["Nights", `${property.minimum_nights ?? "—"} – ${property.maximum_nights ?? "—"}`],
    ["Cancellation", property.cancellation_policy ?? "—"],
    ["Listed", date(property.created_at)],
    ["Last updated", date(property.updated_at)],
  ];

  return (
    <section className="admin-rise admin-detail">
      <Link className="btn btn-ghost admin-back" href="/admin/properties">
        <ArrowLeft size={15} /> All properties
      </Link>

      <header className="admin-detail-head">
        <div>
          <h2 className="admin-detail-title">{property.title}</h2>
          <p className="text-muted admin-detail-sub">
            {property.type} · {property.city ?? "—"}, {property.country ?? "—"}
          </p>
        </div>
        <div className="admin-detail-tags">
          <span className={`tag ${tagClassFor(property.status)}`}>{property.status}</span>
          {property.is_featured && (
            <span className="tag tag-outline">
              <Star size={11} aria-hidden /> Featured
            </span>
          )}
        </div>
      </header>

      <PropertyModerationBar
        id={property.id}
        title={property.title}
        hostName={property.host?.name ?? "The host"}
        status={property.status}
        isFeatured={property.is_featured}
        reviewCount={property.review_count}
      />

      {property.moderation_note && (
        <div className="card elev-sm admin-note">
          <p className="card-kicker">Moderation note</p>
          <p className="admin-note-body">{property.moderation_note}</p>
          <p className="text-muted admin-note-meta">
            {property.reviewed_by ? `${property.reviewed_by} · ` : ""}
            {date(property.reviewed_at)}
          </p>
        </div>
      )}

      <div className="admin-grid admin-grid-kpi admin-section">
        <MetricCard label="Price / night" value={money(property.price_per_night, property.currency)} />
        <MetricCard
          label="Rating"
          value={property.rating_avg != null ? String(property.rating_avg) : "—"}
          delta={`${property.review_count.toLocaleString()} reviews`}
        />
        <MetricCard label="Bookings" value={property.booking_count.toLocaleString()} />
        <MetricCard label="Amenities" value={property.amenities.length.toLocaleString()} />
      </div>

      <div className="admin-grid admin-grid-2 admin-section">
        <article className="card elev-sm admin-chart-card">
          <h3 className="card-title">Listing</h3>
          {cover && (
            <Image
              className="admin-detail-photo"
              src={cover.url}
              alt={cover.caption ?? property.title}
              width={720}
              height={420}
              sizes="(max-width: 900px) 100vw, 50vw"
            />
          )}
          {/* Cleaned at the point of display, not in the query: the edit form
              on this same object must keep the raw source, or saving would
              silently rewrite the row with our reformatting. */}
          {property.summary && (
            <p className="card-body">{cleanListingText(property.summary)}</p>
          )}
          {property.description && (
            <p className="card-body">{cleanListingText(property.description)}</p>
          )}
          {property.house_rules && (
            <>
              <p className="card-kicker">House rules</p>
              <p className="card-body">{cleanListingText(property.house_rules)}</p>
            </>
          )}
          {property.listing_url && (
            <a className="btn btn-ghost admin-self-start" href={property.listing_url} target="_blank" rel="noreferrer">
              Source listing <ExternalLink size={14} />
            </a>
          )}
        </article>

        <div className="admin-side-stack">
          <article className="card elev-sm">
            <h3 className="card-title">Host</h3>
            {property.host ? (
              <div className="admin-host">
                {property.host.picture_url && (
                  <Image
                    className="admin-host-avatar"
                    src={property.host.picture_url}
                    alt=""
                    width={48}
                    height={48}
                  />
                )}
                <div>
                  <p className="admin-host-name">{property.host.name}</p>
                  <p className="text-muted admin-host-meta">
                    {property.host.location ?? "Location unknown"} ·{" "}
                    {property.host.listings_count ?? 0} listings
                  </p>
                  <p className="admin-host-tags">
                    {property.host.is_superhost && <span className="tag tag-accent-2">Superhost</span>}
                    {property.host.identity_verified && <span className="tag tag-outline">ID verified</span>}
                    {property.host.response_rate !== null && (
                      <span className="tag tag-neutral">{property.host.response_rate}% response</span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted">No host record is linked to this listing.</p>
            )}
          </article>

          <article className="card elev-sm">
            <h3 className="card-title">Details</h3>
            <dl className="admin-facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted">{label}</dt>
                  <dd className="admin-num">{value}</dd>
                </div>
              ))}
            </dl>
            {property.street && <p className="text-muted admin-address">{property.street}</p>}
          </article>
        </div>
      </div>

      {property.amenities.length > 0 && (
        <article className="card elev-sm admin-section">
          <h3 className="card-title">Amenities</h3>
          <ul className="admin-chips">
            {property.amenities.map((amenity) => (
              <li key={amenity} className="tag tag-neutral">
                {amenity}
              </li>
            ))}
          </ul>
        </article>
      )}

      {property.recent_reviews.length > 0 && (
        <article className="card elev-sm admin-section">
          <h3 className="card-title">Recent reviews</h3>
          <ul className="admin-reviews">
            {property.recent_reviews.map((review) => (
              <li key={review.id}>
                <p className="admin-review-head">
                  <strong>{review.reviewer ?? "Guest"}</strong>
                  <span className="text-muted">{date(review.date)}</span>
                </p>
                <p className="card-body">{review.comments}</p>
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
}
