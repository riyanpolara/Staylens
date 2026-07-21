import { Star } from "lucide-react";
import type { PropertyDetail } from "@/lib/queries";

const DATE_FMT = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

const CATEGORY_LABELS: Record<string, string> = {
  cleanliness: "Cleanliness",
  accuracy: "Accuracy",
  checkin: "Check-in",
  communication: "Communication",
  location: "Location",
  value: "Value",
};

function initials(name: string | null): string {
  if (!name) return "★";
  return name.trim().slice(0, 1).toUpperCase();
}

/** Reviews: overall rating, category score bars, and individual review cards. */
export function ReviewsSection({ property }: { property: PropertyDetail }) {
  const { rating, reviewsCount, scores, reviews } = property;
  const categories = Object.entries(scores).filter(([, v]) => v != null) as [
    string,
    number,
  ][];

  if (reviewsCount === 0 && reviews.length === 0) return null;

  return (
    <section aria-labelledby="reviews-heading">
      <h2
        id="reviews-heading"
        className="font-display text-xl md:text-2xl font-semibold text-primary mb-6 flex items-center gap-2"
      >
        <Star aria-hidden className="size-6 fill-primary text-primary" />
        {rating > 0 ? rating.toFixed(2) : "New"}
        <span className="text-on-surface-variant font-normal">
          · {reviewsCount.toLocaleString()} review{reviewsCount === 1 ? "" : "s"}
        </span>
      </h2>

      {/* category score bars */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 mb-10 max-w-2xl">
          {categories.map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <span className="w-32 text-sm text-on-surface-variant shrink-0">
                {CATEGORY_LABELS[key] ?? key}
              </span>
              <div className="flex-1 h-1 bg-outline-variant/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(value / 5) * 100}%` }}
                />
              </div>
              <span className="w-8 text-sm font-semibold text-right tabular-nums">
                {value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* individual reviews */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {reviews.slice(0, 6).map((r, i) => (
            <article key={i}>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-11 h-11 rounded-full bg-primary-fixed/60 text-on-primary-fixed-variant flex items-center justify-center font-bold">
                  {initials(r.reviewerName)}
                </span>
                <div>
                  <p className="font-semibold text-on-surface">{r.reviewerName ?? "Guest"}</p>
                  {r.date && (
                    <p className="text-sm text-on-surface-variant">
                      {DATE_FMT.format(new Date(r.date))}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-on-surface-variant leading-relaxed line-clamp-5">
                {r.comment}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
