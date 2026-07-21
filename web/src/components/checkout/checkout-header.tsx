"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, TreePine } from "lucide-react";

/** Slim, trust-forward checkout header: back, logo, secure badge. */
export function CheckoutHeader({ backHref }: { backHref: string }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-50 glass-header bg-surface/85 border-b border-outline-variant/30">
      <div className="flex justify-between items-center w-full px-4 md:px-16 h-20 max-w-[1120px] mx-auto">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            aria-label="Back to property"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-all active:scale-90"
          >
            <ArrowLeft aria-hidden className="size-5 text-primary" />
          </button>
          <h1 className="font-display text-xl md:text-2xl font-bold text-primary tracking-tight">
            Confirm and pay
          </h1>
        </div>
        <Link
          href="/"
          className="hidden sm:flex items-center gap-2 text-primary"
          aria-label="Staylens home"
        >
          <TreePine aria-hidden className="size-7" strokeWidth={1.8} />
          <span className="font-display text-lg font-bold tracking-tight">Staylens</span>
        </Link>
        <span className="sm:hidden inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
          <Lock aria-hidden className="size-3.5 text-primary" />
          Secure
        </span>
      </div>
    </header>
  );
}
