import Link from "next/link";
import { BadgeCheck, MessageSquareX, Star } from "lucide-react";
import { tagClassFor } from "@/lib/admin/types";
import { formatDateShort, initialsOf } from "@/lib/admin/user-query";
import {
  STATUS_LABEL,
  type AdminReviewDetail,
  type ReviewStatus,
} from "@/lib/admin/review-query";
import { UserModalShell } from "@/components/admin/users/user-modal-shell";
import { ReviewDetailActions } from "@/components/admin/reviews/review-detail-actions";

/**
 * The review detail panel: the full comment, who wrote it, which property and
 * host it concerns, and the moderation history.
 *
 * Reuses the users modal shell — focus trapping, Escape handling and the
 * backdrop are not review-specific, and a second implementation is how the two
 * panels start behaving differently.
 */

const SOURCE_LABEL: Record<string, string> = {
  mongodb_airbnb: "MongoDB import",
  inside_airbnb: "Inside Airbnb",
  staylens: "Written on StayLens",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="admin-us-stat">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function ReviewDetailPanel({
  review,
  closeHref,
}: {
  review: AdminReviewDetail;
  closeHref: string;
}) {
  const place = [review.property.city, review.property.country].filter(Boolean).join(", ");

  return (
    <UserModalShell closeHref={closeHref} titleId="review-detail-title">
      <header className="admin-us-head">
        <span className="admin-us-avatar admin-us-avatar-lg" aria-hidden>
          {review.reviewer.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote avatar
            <img src={review.reviewer.avatar_url} alt="" loading="lazy" />
          ) : (
            initialsOf(review.reviewer.name)
          )}
        </span>

        <div className="admin-us-head-text">
          <h2 className="card-title" id="review-detail-title">
            {review.reviewer.name}
          </h2>
          <p className="text-muted">
            {review.reviewer.is_member ? (
              <>
                {review.reviewer.email ?? "Member"}
                {review.reviewer.id && (
                  <>
                    {" · "}
                    <Link className="admin-cell-link" href={`/admin/users?user=${review.reviewer.id}`}>
                      View account
                    </Link>
                  </>
                )}
              </>
            ) : (
              // Imported reviewers have no account to link to.
              "Imported reviewer — no StayLens account"
            )}
          </p>
        </div>

        <span className={`tag ${tagClassFor(review.status)}`}>
          {STATUS_LABEL[review.status as ReviewStatus] ?? review.status}
        </span>
      </header>

      <blockquote className="admin-rv-quote">
        {review.comments?.trim() ? (
          review.comments
        ) : (
          <span className="text-muted">This review has no written comment.</span>
        )}
      </blockquote>

      <dl className="admin-us-stats">
        <Field label="Rating">
          {review.rating === null ? (
            <span className="text-muted" title="This review predates ratings">
              No rating
            </span>
          ) : (
            <span className="admin-rv-rating">
              <Star size={13} aria-hidden />
              {review.rating} / 5
            </span>
          )}
        </Field>

        <Field label="Review date">{formatDateShort(review.review_date)}</Field>
        <Field label="Recorded">{formatDateShort(review.created_at)}</Field>
        <Field label="Source">{SOURCE_LABEL[review.source] ?? review.source}</Field>

        <Field label="Property">
          {review.property.id ? (
            <Link className="admin-cell-link" href={`/admin/properties/${review.property.id}`}>
              {review.property.name ?? "Untitled"}
            </Link>
          ) : (
            <span className="text-muted">Property removed</span>
          )}
          {place && <span className="text-muted"> · {place}</span>}
        </Field>

        <Field label="Host">
          {review.host.name ? (
            <>
              {review.host.name}
              {review.host.is_superhost && (
                <span className="admin-rv-superhost" title="Superhost">
                  {" "}
                  <BadgeCheck size={13} aria-hidden /> Superhost
                </span>
              )}
            </>
          ) : (
            <span className="text-muted">—</span>
          )}
        </Field>

        {/* Only meaningful once someone has moderated it. */}
        {review.reviewed_at && (
          <Field label="Last moderated">
            {formatDateShort(review.reviewed_at)}
            {review.reviewed_by_name && ` by ${review.reviewed_by_name}`}
          </Field>
        )}
        {review.moderation_note && (
          <Field label="Moderation note">{review.moderation_note}</Field>
        )}
      </dl>

      <ReviewDetailActions
        reviewId={review.id}
        status={review.status}
        closeHref={closeHref}
      />
    </UserModalShell>
  );
}

export function ReviewNotFound({ closeHref }: { closeHref: string }) {
  return (
    <UserModalShell closeHref={closeHref} titleId="review-missing-title">
      <div className="admin-empty" style={{ padding: "var(--space-6) 0" }}>
        <span className="admin-empty-icon admin-empty-icon-warn" aria-hidden>
          <MessageSquareX size={24} />
        </span>
        <h2 className="card-title" id="review-missing-title">
          Review not found
        </h2>
        <p className="text-muted">
          This review no longer exists — it may have just been removed by another admin.
        </p>
      </div>
    </UserModalShell>
  );
}
