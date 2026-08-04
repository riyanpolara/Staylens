import type { Metadata } from "next";
import { ProfileTopNav } from "@/components/profile/profile-top-nav";
import { ProfileFooter } from "@/components/profile/profile-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationsClient } from "@/components/notifications/notifications-client";
import { getNotifications, groupNotifications } from "@/lib/notifications";
import { getProfile } from "@/lib/profile";

/**
 * Notification centre. The proxy requires a session on /notifications, so this
 * never renders for an anonymous visitor.
 */

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false },
};

export default async function NotificationsPage() {
  const [profile, items] = await Promise.all([getProfile(), getNotifications()]);
  const groups = groupNotifications(items);
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <>
      <ProfileTopNav
        avatarUrl={profile?.avatarUrl ?? ""}
        name={profile?.fullName ?? ""}
        email={profile?.email ?? ""}
      />
      <main id="main-content" className="max-w-[760px] mx-auto px-4 md:px-16 py-16">
        <h1 className="font-display text-3xl font-semibold text-on-surface mb-8">
          Notifications
        </h1>
        <NotificationsClient groups={groups} unread={unread} />
      </main>
      <ProfileFooter />
      <MobileNav active="Notifications" />
    </>
  );
}
