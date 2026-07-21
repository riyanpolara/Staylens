import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  /** current query params, preserved across page links */
  params: Record<string, string>;
};

function href(params: Record<string, string>, page: number) {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const qs = next.toString();
  return qs ? `/search?${qs}` : "/search";
}

/** Numbered pagination (server component) — design-token pills. */
export function Pagination({ page, totalPages, params }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => start + i,
  );

  return (
    <nav aria-label="Results pages" className="flex items-center justify-center gap-2 mt-16">
      <Link
        href={href(params, page - 1)}
        aria-label="Previous page"
        aria-disabled={page === 1}
        tabIndex={page === 1 ? -1 : undefined}
        className={cn(
          "w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:border-primary hover:text-primary transition-colors",
          page === 1 && "pointer-events-none opacity-30",
        )}
      >
        <ChevronLeft aria-hidden className="size-4" />
      </Link>

      {pages[0] > 1 && <span className="text-on-surface-variant px-1">…</span>}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(params, p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
            p === page
              ? "cta-gradient text-white"
              : "border border-outline-variant hover:border-primary hover:text-primary",
          )}
        >
          {p}
        </Link>
      ))}
      {pages[pages.length - 1] < totalPages && (
        <span className="text-on-surface-variant px-1">…</span>
      )}

      <Link
        href={href(params, page + 1)}
        aria-label="Next page"
        aria-disabled={page === totalPages}
        tabIndex={page === totalPages ? -1 : undefined}
        className={cn(
          "w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:border-primary hover:text-primary transition-colors",
          page === totalPages && "pointer-events-none opacity-30",
        )}
      >
        <ChevronRight aria-hidden className="size-4" />
      </Link>
    </nav>
  );
}
