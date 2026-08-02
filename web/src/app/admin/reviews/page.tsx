import { Suspense } from "react";
import { getReviewDetail, getReviewStatusCounts, getReviews } from "@/lib/admin/reviews";
import {
  hasActiveFilters,
  parseOpenReviewId,
  parseReviewQuery,
  reviewsHref,
  type ReviewQuery,
  type SearchParams,
} from "@/lib/admin/review-query";
import { ReviewsToolbar } from "@/components/admin/reviews/reviews-toolbar";
import { ReviewsTable } from "@/components/admin/reviews/reviews-table";
import { ReviewsPagination } from "@/components/admin/reviews/reviews-pagination";
import {
  NoReviewsMatch,
  NoReviewsYet,
  ReviewsError,
  ReviewsTableSkeleton,
} from "@/components/admin/reviews/reviews-states";
import {
  ReviewDetailPanel,
  ReviewNotFound,
} from "@/components/admin/reviews/review-detail-panel";
import "./reviews.css";

/**
 * Reviews — moderation queue.
 *
 * A Server Component that reads its entire state from the URL and answers it
 * with one `admin_reviews_list()` call: search, status/rating/source filters,
 * sort, page and page size are all resolved in Postgres, so 43k rows never reach
 * the client to be counted or filtered. `?review=<id>` additionally
 * server-renders the detail panel, which keeps a review linkable and
 * back-button-correct.
 *
 * The list deliberately reads through a SECURITY DEFINER function rather than a
 * PostgREST select: rejected and deleted reviews are hidden from every ordinary
 * query — that is what makes moderation take effect — so only the definer
 * functions can show them in the queue.
 */

export const metadata = { title: "Reviews" };

/** Filters and paging are request-time state; there is nothing to prerender. */
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const query = parseReviewQuery(sp);
  const openId = parseOpenReviewId(sp);

  return (
    <section className="admin-rise">
      {/* Outside the boundary: the filters stay usable while results load. */}
      <Suspense fallback={<ReviewsToolbar query={query} counts={null} />}>
        <ReviewsToolbarWithCounts query={query} />
      </Suspense>

      {/* Keyed on the list state so every search / filter / sort / page change
          re-suspends and shows the skeleton instead of stale rows. `?review=` is
          deliberately NOT in the key: opening a review must not blank the table
          behind it — the boundary re-renders in place and the panel streams in. */}
      <Suspense
        key={reviewsHref(query)}
        fallback={<ReviewsTableSkeleton rows={query.pageSize} />}
      >
        <ReviewsResults query={query} openId={openId} />
      </Suspense>
    </section>
  );
}

/**
 * The status counts are a second round trip, so they stream separately — the
 * toolbar renders immediately without them and fills the numbers in when they
 * land, rather than holding up the filters.
 */
async function ReviewsToolbarWithCounts({ query }: { query: ReviewQuery }) {
  const counts = await getReviewStatusCounts();
  return <ReviewsToolbar query={query} counts={counts.ok ? counts.data : null} />;
}

async function ReviewsResults({
  query,
  openId,
}: {
  query: ReviewQuery;
  openId: string | null;
}) {
  const [list, detail] = await Promise.all([
    getReviews(query),
    openId ? getReviewDetail(openId) : Promise.resolve(null),
  ]);

  if (!list.ok) return <ReviewsError reason={list.reason} message={list.message} />;

  const { rows, total, page, pageCount, pageSize } = list.data;
  // Same view, minus `?review=` — `reviewsHref` never carries the open panel over.
  const closeHref = reviewsHref(query);

  return (
    <>
      {rows.length === 0 ? (
        hasActiveFilters(query) ? (
          <NoReviewsMatch clearHref="/admin/reviews" />
        ) : (
          <NoReviewsYet />
        )
      ) : (
        <>
          <ReviewsTable rows={rows} query={query} />
          <ReviewsPagination
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
          <ReviewDetailPanel review={detail.data} closeHref={closeHref} />
        ) : (
          <ReviewNotFound closeHref={closeHref} />
        ))}
    </>
  );
}
