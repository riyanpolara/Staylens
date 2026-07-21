import type { Metadata } from "next";
import { ProfileTopNav } from "@/components/profile/profile-top-nav";
import { SidebarNavigation } from "@/components/profile/sidebar-navigation";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { ProfileFooter } from "@/components/profile/profile-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getProfile } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Edit Profile",
  description: "Manage your Staylens profile, languages, connections and privacy.",
};

export default async function EditProfilePage() {
  const profile = await getProfile();

  return (
    <>
      <ProfileTopNav avatarUrl={profile.avatarUrl} name={profile.fullName} />
      <main id="main-content" className="max-w-[1280px] mx-auto px-4 md:px-16 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <SidebarNavigation active="personal" />
          <ProfileEditor profile={profile} />
        </div>
      </main>
      <ProfileFooter />
      <MobileNav active="Profile" />
    </>
  );
}
