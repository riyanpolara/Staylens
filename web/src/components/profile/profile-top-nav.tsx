import Image from "next/image";
import Link from "next/link";
import { Menu, TreePine } from "lucide-react";

const LINKS = [
  { label: "Explore", href: "/" },
  { label: "Wishlist", href: "#" },
  { label: "Trips", href: "#" },
];

/** Sticky top navigation for the profile area (Stitch). */
export function ProfileTopNav({
  avatarUrl,
  name,
}: {
  avatarUrl: string;
  name: string;
}) {
  return (
    <header className="sticky top-0 z-50 glass-header bg-surface/80 border-b border-outline-variant/30">
      <nav className="flex justify-between items-center w-full px-4 md:px-16 h-20 max-w-[1280px] mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
          aria-label="Staylens home"
        >
          <TreePine aria-hidden className="size-8 text-primary" strokeWidth={1.8} />
          <span className="font-display text-2xl font-bold text-primary tracking-tight">
            Staylens
          </span>
        </Link>

        <div className="hidden md:flex gap-10 items-center">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-on-surface-variant text-sm font-semibold hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="w-10 h-10 rounded-full border-2 border-primary-container overflow-hidden">
            <Image
              src={avatarUrl}
              alt={name}
              width={40}
              height={40}
              unoptimized
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <button
          type="button"
          aria-label="Open menu"
          className="md:hidden p-2 text-on-surface rounded-md hover:bg-surface-container-low transition-colors"
        >
          <Menu aria-hidden className="size-6" />
        </button>
      </nav>
    </header>
  );
}
