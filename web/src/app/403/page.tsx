import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false, follow: false },
};

/**
 * 403 for signed-in users who lack the required role. Deliberately vague about
 * what exists behind the wall, and styled with the public site's own tokens so
 * no admin CSS is pulled in for a non-admin visitor.
 */
export default function ForbiddenPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-16 bg-surface">
      <div className="max-w-md text-center">
        <span
          aria-hidden
          className="mx-auto mb-6 grid place-items-center w-16 h-16 rounded-full bg-surface-container"
        >
          <ShieldAlert className="size-8 text-on-surface-variant" strokeWidth={1.6} />
        </span>
        <h1 className="font-display text-3xl font-bold text-on-surface mb-3">
          Access denied
        </h1>
        <p className="text-on-surface-variant mb-8">
          Your account doesn&apos;t have permission to view this page. If you think
          this is a mistake, contact an administrator.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="cta-gradient text-white font-semibold rounded-full px-6 h-12 inline-flex items-center"
          >
            Back to Staylens
          </Link>
          <Link
            href="/search"
            className="border border-outline-variant text-on-surface font-semibold rounded-full px-6 h-12 inline-flex items-center hover:border-primary transition-colors"
          >
            Browse stays
          </Link>
        </div>
      </div>
    </main>
  );
}
