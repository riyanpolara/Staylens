"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PAGE_SIZE_OPTIONS,
  reviewsHref,
  type ReviewQuery,
} from "@/lib/admin/review-query";

/** Rows per page. A select rather than links, because it is a preference about
 *  the view rather than a place in it — but it still lands in the URL. */
export function ReviewPageSizePicker({
  query,
  pageSize,
}: {
  query: ReviewQuery;
  pageSize: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const id = useId();

  return (
    <span className="admin-us-per-page">
      <label htmlFor={id}>Rows</label>
      <select
        id={id}
        className="btn btn-secondary admin-select"
        value={pageSize}
        disabled={pending}
        onChange={(event) =>
          startTransition(() =>
            router.replace(reviewsHref(query, { pageSize: Number(event.target.value) }), {
              scroll: false,
            }),
          )
        }
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </span>
  );
}
