"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2, TreePine } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Slim header for the detail page (Stitch): back button, brand, Help/Share. */
export function DetailHeader() {
  const router = useRouter();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 50));

  return (
    <header
      className={cn(
        "fixed top-0 left-0 w-full z-50 glass-header bg-surface/80 border-b border-outline-variant/30 transition-shadow",
        scrolled && "shadow-sm",
      )}
    >
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex justify-between items-center w-full px-4 md:px-16 h-20 max-w-[1280px] mx-auto"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-all active:scale-95"
          >
            <ArrowLeft aria-hidden className="size-5 text-primary" />
          </button>
          <Link href="/" className="flex items-center gap-2" aria-label="Staylens home">
            <TreePine aria-hidden className="size-7 text-primary" strokeWidth={1.8} />
            <span className="font-display text-2xl font-bold text-primary tracking-tight hidden sm:inline">
              Staylens
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <button className="px-4 py-2 text-on-surface-variant text-sm font-semibold hover:text-primary transition-colors hidden sm:block">
            Help
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 text-on-surface-variant text-sm font-semibold hover:text-primary transition-colors">
            <Share2 aria-hidden className="size-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </motion.nav>
    </header>
  );
}
