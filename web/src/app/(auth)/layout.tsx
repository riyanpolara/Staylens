import Link from "next/link";
import { TreePine, X } from "lucide-react";

/**
 * Focused auth shell — a light Staylens-branded frame with a centered card,
 * matching the Stitch "Welcome back" / "Finish signing up" screens. No global
 * SiteHeader/MobileNav so the flow feels self-contained.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface flex flex-col">
      <header className="w-full">
        <div className="max-w-[1100px] mx-auto h-20 px-4 md:px-8 flex items-center justify-between">
          <Link
            href="/"
            aria-label="Staylens home"
            className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <TreePine aria-hidden className="size-7 text-primary" strokeWidth={1.8} />
            <span className="font-display text-xl font-bold tracking-tight text-primary">
              Staylens
            </span>
          </Link>
          <Link
            href="/"
            aria-label="Close"
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
          >
            <X aria-hidden className="size-5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-start md:items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-[520px]">{children}</div>
      </main>

      <footer className="w-full border-t border-outline-variant/30 mt-8">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-8 text-sm text-on-surface-variant">
          <p className="font-display text-lg font-semibold text-on-surface mb-1">Staylens</p>
          <p className="max-w-xs">
            Curating the world&apos;s most breathtaking nature escapes for the
            discerning traveler.
          </p>
        </div>
      </footer>
    </div>
  );
}
