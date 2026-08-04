import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileTopNav } from "@/components/profile/profile-top-nav";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { ProfileFooter } from "@/components/profile/profile-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  getProfile,
  getProfileCompletion,
  getProfileStats,
  getTrips,
} from "@/lib/profile";

export const metadata: Metadata = {
  title: "Edit Profile",
  description: "Manage your Staylens profile, languages, connections and privacy.",
};

export default async function EditProfilePage() {
  const [profile, trips] = await Promise.all([getProfile(), getTrips()]);

  // The proxy gates /profile, so this only fires if the session died mid-request.
  if (!profile) redirect("/login?redirect=%2Fprofile%2Fedit");

  const stats = await getProfileStats(trips);
  const completion = getProfileCompletion(profile);

  return (
    <>
      <ProfileTopNav
        avatarUrl={profile.avatarUrl}
        name={profile.fullName}
        email={profile.email}
      />
      {/* Without the settings sidebar the form is the only column, so it is
          capped and centred rather than stretched across the full 1280px —
          form fields that wide are hard to scan. */}
      <main id="main-content" className="max-w-[960px] mx-auto px-4 md:px-16 py-16">
        <ProfileEditor
          profile={profile}
          stats={stats}
          trips={trips}
          completion={completion}
        />
      </main>
      <ProfileFooter />
      <MobileNav active="Profile" />
    </>
  );
}
