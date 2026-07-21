"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import type { ProfileFormValues } from "@/lib/profile-schema";

const ROWS: {
  name: "privacy.publicProfile" | "privacy.showWishlists";
  title: string;
  sub: string;
}[] = [
  { name: "privacy.publicProfile", title: "Public Profile", sub: "Allow search engines to index" },
  { name: "privacy.showWishlists", title: "Show Wishlists", sub: "Visible to your connections" },
];

/** Privacy toggles (shadcn Switch, wired through React Hook Form). */
export function PrivacySettingsCard() {
  const { control } = useFormContext<ProfileFormValues>();
  return (
    <section className="bg-white rounded-[20px] p-6 md:p-10 shadow-tinted border border-outline-variant/10">
      <h3 className="font-display text-2xl font-semibold text-on-surface mb-6">Privacy Settings</h3>
      <div className="space-y-6">
        {ROWS.map((row) => (
          <div key={row.name} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{row.title}</p>
              <p className="text-xs text-on-surface-variant">{row.sub}</p>
            </div>
            <Controller
              control={control}
              name={row.name}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                  aria-label={row.title}
                />
              )}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
