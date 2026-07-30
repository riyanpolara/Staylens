"use client";

import { BadgeCheck, MapPin } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import type { Profile } from "@/lib/profile";

/** Profile header: avatar + upload, name, location, verified badge, Save. */
export function ProfileHeaderCard({
  profile,
  saving,
}: {
  profile: Profile;
  saving: boolean;
}) {
  return (
    <section className="flex flex-col md:flex-row items-center gap-6 p-6 bg-white rounded-[20px] shadow-tinted border border-outline-variant/10">
      <ProfileAvatar initialUrl={profile.avatarUrl} name={profile.fullName} />

      <div className="text-center md:text-left flex-1">
        <h1 className="font-display text-[32px] leading-10 font-bold text-on-surface">
          {profile.fullName || "Your name"}
        </h1>
        <p className="flex items-center justify-center md:justify-start gap-2 text-on-surface-variant mt-1">
          <MapPin aria-hidden className="size-5 text-primary" />
          <span className={profile.location ? undefined : "opacity-70"}>
            {profile.location || "Not specified"}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
          <span
            className={
              profile.identityVerified
                ? "bg-surface-container-high px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 text-primary"
                : "bg-surface-container px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 text-on-surface-variant"
            }
          >
            <BadgeCheck aria-hidden className="size-4" />
            {profile.identityVerified ? "Identity Verified" : "Not verified"}
          </span>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 rounded-xl text-white text-sm font-semibold cta-gradient shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-70"
        >
          Save Changes
        </button>
      </div>
    </section>
  );
}
