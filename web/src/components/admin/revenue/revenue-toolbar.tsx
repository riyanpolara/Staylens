import Link from "next/link";
import { Download } from "lucide-react";
import { RANGES, revenueHref, type RevenueQuery } from "@/lib/admin/revenue-query";

/**
 * Grain tabs + window caption + Export / Payout run, per the design.
 *
 * The tabs are links rather than the design's radio inputs so the view stays in
 * the URL — shareable, back-button-correct, and readable by the server page
 * that renders everything below. `.seg-opt` is styled off `:has(input:checked)`
 * in the shared theme, so revenue.css adds the `[data-active]` variant for the
 * link form rather than duplicating the whole control.
 */
export function RevenueToolbar({
  query,
  csvHref,
}: {
  query: RevenueQuery;
  csvHref: string;
}) {
  const preset = RANGES.find((r) => r.key === query.range) ?? RANGES[1];

  return (
    <div className="admin-rev-toolbar">
      <div className="seg admin-rev-seg" role="group" aria-label="Revenue granularity">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            className="seg-opt"
            data-active={r.key === query.range || undefined}
            aria-current={r.key === query.range ? "true" : undefined}
            href={revenueHref(query, { range: r.key, bucket: null })}
            scroll={false}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <span className="admin-rev-note">{preset.note}</span>

      <div className="admin-rev-actions">
        {/* A real download of the current window, not a decorative button. */}
        <a className="btn btn-secondary" href={csvHref} download>
          <Download size={15} aria-hidden />
          Export
        </a>
        {/* There is no payouts pipeline yet — no payout table, no host accounts
            to pay. Rendered disabled rather than wired to something that would
            look like it moved money and did not. */}
        <button
          type="button"
          className="btn btn-primary"
          disabled
          title="Payout runs need a payouts pipeline, which does not exist yet."
        >
          Payout run
        </button>
      </div>
    </div>
  );
}
