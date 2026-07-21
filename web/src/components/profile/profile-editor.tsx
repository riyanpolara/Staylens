"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/shared/reveal";
import { ProfileHeaderCard } from "@/components/profile/profile-header-card";
import { AchievementsGrid } from "@/components/profile/achievements-grid";
import { BasicInformationCard } from "@/components/profile/basic-information-card";
import { AboutCard } from "@/components/profile/about-card";
import { PersonalityCard } from "@/components/profile/personality-card";
import { LanguagesCard } from "@/components/profile/languages-card";
import { TravelHistoryCard } from "@/components/profile/travel-history-card";
import { ConnectedAccountsCard } from "@/components/profile/connected-accounts-card";
import { PrivacySettingsCard } from "@/components/profile/privacy-settings-card";
import { profileFormSchema, type ProfileFormValues } from "@/lib/profile-schema";
import { saveProfile } from "@/app/profile/edit/actions";
import type { Profile } from "@/lib/profile";

function toDefaults(p: Profile): ProfileFormValues {
  return {
    legalName: p.legalName,
    email: p.email,
    phone: p.phone,
    emergencyContact: p.emergencyContact ?? "",
    about: p.about,
    personality: p.personality,
    languages: p.languages,
    connectedAccounts: p.connectedAccounts,
    privacy: p.privacy,
  };
}

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; msg: string }
  | { kind: "error"; msg: string };

/** Client form wrapper for the editable profile area (col-span-9). */
export function ProfileEditor({ profile }: { profile: Profile }) {
  const methods = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toDefaults(profile),
    mode: "onBlur",
  });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const saving = status.kind === "saving";

  async function onSubmit(values: ProfileFormValues) {
    setStatus({ kind: "saving" });
    const res = await saveProfile(values);
    if (!res.ok) {
      setStatus({ kind: "error", msg: res.error });
      return;
    }
    methods.reset(values);
    setStatus({
      kind: "saved",
      msg: res.persisted
        ? "All changes saved."
        : "Saved — apply the profiles migration to persist to Supabase.",
    });
  }

  function onInvalid() {
    setStatus({ kind: "error", msg: "Please fix the highlighted fields and try again." });
  }

  return (
    <FormProvider {...methods}>
      <form
        noValidate
        onSubmit={methods.handleSubmit(onSubmit, onInvalid)}
        className="lg:col-span-9 space-y-16"
      >
        <Reveal>
          <ProfileHeaderCard profile={profile} saving={saving} />
        </Reveal>

        <Reveal>
          <AchievementsGrid />
        </Reveal>

        <Reveal>
          <BasicInformationCard />
        </Reveal>

        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AboutCard />
            <PersonalityCard />
          </div>
        </Reveal>

        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LanguagesCard />
            <TravelHistoryCard history={profile.travelHistory} />
          </div>
        </Reveal>

        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ConnectedAccountsCard />
            <PrivacySettingsCard />
          </div>
        </Reveal>

        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 pt-6 border-t border-outline-variant/30">
          {status.kind !== "idle" && status.kind !== "saving" && (
            <p
              role="status"
              className={cn(
                "text-sm md:mr-auto",
                status.kind === "error" ? "text-destructive" : "text-primary",
              )}
            >
              {status.msg}
            </p>
          )}
          <div className="flex gap-6 justify-end md:ml-auto">
            <button
              type="button"
              onClick={() => {
                methods.reset(toDefaults(profile));
                setStatus({ kind: "idle" });
              }}
              className="px-8 py-3 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-all"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-10 py-3 rounded-xl text-white font-bold cta-gradient shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 aria-hidden className="size-5 animate-spin" />}
              {saving ? "Saving…" : "Save All Changes"}
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
