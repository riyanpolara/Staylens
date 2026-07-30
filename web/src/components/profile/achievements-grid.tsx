import { Globe, Heart, MessageSquare, Plane } from "lucide-react";
import { AchievementCard, type Achievement } from "@/components/profile/achievement-card";
import type { ProfileStats } from "@/lib/profile";

/**
 * The four headline numbers, all counted from the database.
 *
 * These replaced fixed badges ("Super Host", "50 Trips", "4.9 Rating",
 * "Eco-Traveler") that read the same for every visitor. A new account now
 * correctly shows 0 across the board rather than borrowing someone's record.
 */
export function AchievementsGrid({ stats }: { stats: ProfileStats }) {
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

  const items: Achievement[] = [
    {
      icon: Globe,
      label: `${stats.tripsCompleted} ${plural(stats.tripsCompleted, "Trip", "Trips")}`,
      sublabel: stats.tripsCompleted === 0 ? "No trips yet" : "Completed",
      iconBg: "bg-primary-fixed",
      iconText: "text-on-primary-fixed-variant",
    },
    {
      icon: Plane,
      label: `${stats.tripsUpcoming} Upcoming`,
      sublabel: stats.tripsUpcoming === 0 ? "Nothing booked" : "Booked ahead",
      iconBg: "bg-tertiary-fixed",
      iconText: "text-on-tertiary-fixed-variant",
    },
    {
      icon: Heart,
      label: `${stats.wishlistCount} Saved`,
      sublabel: stats.wishlistCount === 0 ? "No saved stays" : "In your wishlist",
      iconBg: "bg-secondary-fixed",
      iconText: "text-on-secondary-fixed-variant",
    },
    {
      icon: MessageSquare,
      // Show the average only once one exists — "0.0 Rating" reads as a bad
      // score rather than an absent one, so fall back to the review count.
      label: stats.averageRatingGiven
        ? `${stats.averageRatingGiven.toFixed(1)} Rating`
        : `${stats.reviewsWritten} ${plural(stats.reviewsWritten, "Review", "Reviews")}`,
      sublabel: stats.reviewsWritten === 0 ? "No reviews yet" : "Average you gave",
      iconBg: "bg-surface-container-highest",
      iconText: "text-on-surface-variant",
    },
  ];

  return (
    <section aria-label="Your activity" className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {items.map((a) => (
        <AchievementCard key={a.label + a.sublabel} {...a} />
      ))}
    </section>
  );
}
