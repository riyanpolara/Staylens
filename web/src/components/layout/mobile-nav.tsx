import {
  CircleUserRound,
  Compass,
  Heart,
  MessageCircle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Explore", icon: Search, href: "/" },
  { label: "Wishlist", icon: Heart, href: "/wishlist" },
  { label: "Trips", icon: Compass, href: "/trips" },
  { label: "Messages", icon: MessageCircle, href: "/messages" },
  { label: "Profile", icon: CircleUserRound, href: "/profile/edit" },
];

/** Bottom tab bar, mobile only — safe-area aware. */
export function MobileNav({ active = "Explore" }: { active?: string }) {
  return (
    <nav
      aria-label="Mobile"
      className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-[max(env(safe-area-inset-bottom),12px)] px-2 md:hidden bg-surface shadow-nav-top border-t border-outline-variant/20 z-50 rounded-t-xl"
    >
      {ITEMS.map(({ label, icon: Icon, href }) => {
        const isActive = label === active;
        return (
          <a
            key={label}
            href={href ?? "#"}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center min-w-11 min-h-11 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2",
              isActive ? "text-primary font-bold" : "text-on-surface-variant",
            )}
          >
            <Icon aria-hidden className="size-6" strokeWidth={isActive ? 2.4 : 1.8} />
            <span className="text-[11px] mt-1">{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
