import { Globe, Leaf, MessageSquare, Star } from "lucide-react";
import { AchievementCard, type Achievement } from "@/components/profile/achievement-card";

const ACHIEVEMENTS: Achievement[] = [
  {
    icon: Star,
    label: "Super Host",
    sublabel: "Top 5% Global",
    iconBg: "bg-tertiary-fixed",
    iconText: "text-on-tertiary-fixed-variant",
  },
  {
    icon: Globe,
    label: "50 Trips",
    sublabel: "Global Explorer",
    iconBg: "bg-primary-fixed",
    iconText: "text-on-primary-fixed-variant",
  },
  {
    icon: MessageSquare,
    label: "4.9 Rating",
    sublabel: "Guest Favorite",
    iconBg: "bg-secondary-fixed",
    iconText: "text-on-secondary-fixed-variant",
  },
  {
    icon: Leaf,
    label: "Eco-Traveler",
    sublabel: "Green Champion",
    iconBg: "bg-surface-container-highest",
    iconText: "text-on-surface-variant",
  },
];

/** Responsive achievement grid (2-up on mobile, 4-up on desktop). */
export function AchievementsGrid() {
  return (
    <section aria-label="Achievements" className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {ACHIEVEMENTS.map((a) => (
        <AchievementCard key={a.label} {...a} />
      ))}
    </section>
  );
}
