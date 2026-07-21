import { AtSign, Globe2, MessageCircle, TreePine } from "lucide-react";
import { FOOTER_LINKS } from "@/lib/placeholder-data";

const SOCIALS = [
  { label: "Website", icon: Globe2 },
  { label: "Chat with us", icon: MessageCircle },
  { label: "Email us", icon: AtSign },
];

export function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant/30 mt-16 pb-20 md:pb-0">
      <div className="w-full py-16 px-4 md:px-16 max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <TreePine aria-hidden className="size-8 text-primary" strokeWidth={1.8} />
            <span className="font-display text-2xl font-bold text-primary tracking-tight">
              Staylens
            </span>
          </div>
          <p className="text-on-surface-variant max-w-xs">
            Connecting discerning travelers with architectural wonders in
            nature&apos;s most beautiful corners.
          </p>
          <div className="flex gap-6">
            {SOCIALS.map(({ label, icon: Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <Icon aria-hidden className="size-5" strokeWidth={1.8} />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 md:col-span-2">
          <nav aria-label="Explore links">
            <h6 className="font-bold mb-6 text-on-surface">Explore</h6>
            <ul className="flex flex-col gap-4">
              {FOOTER_LINKS.explore.map((label) => (
                <li key={label}>
                  <a
                    href="#"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Support links">
            <h6 className="font-bold mb-6 text-on-surface">Support</h6>
            <ul className="flex flex-col gap-4">
              {FOOTER_LINKS.support.map((label) => (
                <li key={label}>
                  <a
                    href="#"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <div className="border-t border-outline-variant/20 py-6 px-4 md:px-16 max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-on-surface-variant text-xs">
          © 2024 Staylens Global Marketplace. All rights reserved.
        </p>
        <div className="flex gap-6 text-on-surface-variant text-xs">
          {["Privacy", "Terms", "Sitemap"].map((label) => (
            <a key={label} href="#" className="hover:text-primary transition-colors">
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
