import { AtSign, Camera, MessageCircle } from "lucide-react";

const SOCIALS = [
  { label: "Community", icon: MessageCircle },
  { label: "Photos", icon: Camera },
  { label: "Email us", icon: AtSign },
];

const SUPPORT = ["Help Center", "Cancellation Options", "Safety Information"];
const HOSTING = ["Host your home", "Community Forum", "Resources"];

/** Footer matching the Stitch Edit Profile screen (Support / Hosting / Newsletter). */
export function ProfileFooter() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant/30 mt-16 pb-24 md:pb-0">
      <div className="w-full py-16 px-4 md:px-16 max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <h4 className="font-display text-2xl font-semibold text-primary tracking-tight">Staylens</h4>
          <p className="text-on-surface-variant max-w-xs">
            Curated nature-focused experiences for the modern traveler. Atmospheric luxury in
            every stay.
          </p>
          <div className="flex gap-6 mt-4">
            {SOCIALS.map(({ label, icon: Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="text-on-surface-variant hover:text-primary transition-colors rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <Icon aria-hidden className="size-6" strokeWidth={1.8} />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <FooterColumn title="Support" links={SUPPORT} />
          <FooterColumn title="Hosting" links={HOSTING} />
        </div>

        <div className="space-y-4 flex flex-col items-start md:items-end">
          <h5 className="text-sm font-semibold text-primary">Newsletter</h5>
          <p className="text-on-surface-variant text-sm md:text-right mb-2">
            Get travel inspiration delivered.
          </p>
          <form className="flex w-full md:w-auto" action="#">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="Email address"
              className="bg-white border border-outline-variant/30 rounded-l-xl px-4 py-2 focus:ring-1 focus:ring-primary w-full md:w-48 outline-none"
            />
            <button
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded-r-xl text-sm font-semibold cta-gradient hover:opacity-90 transition-opacity"
            >
              Join
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 md:px-16 py-6 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-xs text-on-surface-variant">
          © 2024 Staylens Global Marketplace. All rights reserved.
        </p>
        <div className="flex gap-6 text-xs text-on-surface-variant">
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

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="space-y-4">
      <h5 className="text-sm font-semibold text-primary">{title}</h5>
      <ul className="space-y-2 text-on-surface-variant">
        {links.map((label) => (
          <li key={label}>
            <a href="#" className="hover:text-primary transition-colors">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
