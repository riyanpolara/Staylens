import { Bell, CircleUser, CreditCard, Eye, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "personal", label: "Personal Info", icon: CircleUser },
  { key: "security", label: "Login & Security", icon: Shield },
  { key: "payments", label: "Payments & Payouts", icon: CreditCard },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "privacy", label: "Privacy & Sharing", icon: Eye },
] as const;

/** Left settings navigation (desktop only), matching the Stitch sidebar. */
export function SidebarNavigation({ active = "personal" }: { active?: string }) {
  return (
    <aside className="hidden lg:block lg:col-span-3">
      <nav aria-label="Account settings" className="space-y-2 lg:sticky lg:top-28">
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2",
                isActive
                  ? "bg-surface-container text-primary font-bold"
                  : "text-on-surface-variant font-semibold hover:bg-surface-container-low",
              )}
            >
              <Icon
                aria-hidden
                className="size-5 shrink-0"
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
