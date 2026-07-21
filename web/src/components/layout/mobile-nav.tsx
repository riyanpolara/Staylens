import { CircleUserRound, Compass, Heart, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Explore", icon: Search },
  { label: "Wishlist", icon: Heart },
  { label: "Trips", icon: Compass },
  { label: "Profile", icon: CircleUserRound },
];

/** Bottom tab bar, mobile only — mirrors the Stitch bottom navigation. */
export function MobileNav({ active = "Explore" }: { active?: string }) {
  return (
    <nav
      aria-label="Mobile"
      className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-[max(env(safe-area-inset-bottom),12px)] px-4 md:hidden bg-surface shadow-nav-top border-t border-outline-variant/20 z-50 rounded-t-xl"
    >
      {ITEMS.map(({ label, icon: Icon }) => {
        const isActive = label === active;
        return (
          <a
            key={label}
            href="#"
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2",
              isActive ? "text-primary font-bold" : "text-on-surface-variant",
            )}
          >
            <Icon aria-hidden className="size-6" strokeWidth={isActive ? 2.4 : 1.8} />
            <span className="text-xs mt-1">{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
