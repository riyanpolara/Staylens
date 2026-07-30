"use client";

import { cn } from "@/lib/utils";
import type { ConnectedAccount, ConnectedProvider } from "@/lib/profile";

const META: Record<
  ConnectedProvider,
  { name: string; wrap: string; svg: React.ReactNode }
> = {
  facebook: {
    name: "Facebook",
    wrap: "bg-blue-50",
    svg: (
      <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  google: {
    name: "Google",
    wrap: "bg-red-50",
    svg: (
      <svg className="w-5 h-5 text-[#EA4335]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.9 3.32-2.06 4.44-1.14 1.16-2.9 2.42-6.26 2.42-5.4 0-9.76-4.38-9.76-9.78s4.36-9.78 9.76-9.78c3 0 5.2 1.18 6.98 2.86l2.32-2.32C19.16 2.06 16.32.72 12.48.72c-6.84 0-12.48 5.64-12.48 12.48s5.64 12.48 12.48 12.48c3.68 0 6.48-1.2 8.64-3.48 2.24-2.24 2.96-5.44 2.96-8.08 0-.68-.08-1.32-.2-1.92h-11.4z" />
      </svg>
    ),
  },
};

/**
 * Connected accounts, reflecting the guest's actual Supabase Auth identities.
 *
 * This used to be a form field: the Connect button simply flipped a boolean, so
 * clicking it made the profile claim a linked Google account when no OAuth had
 * happened. Linking is an auth operation, not a profile field, so the state is
 * now read from auth and shown as fact.
 */
export function ConnectedAccountsCard({ accounts }: { accounts: ConnectedAccount[] }) {
  return (
    <section className="bg-white rounded-[20px] p-6 md:p-10 shadow-tinted border border-outline-variant/10">
      <h3 className="font-display text-2xl font-semibold text-on-surface mb-6">Connected Accounts</h3>
      <div className="space-y-6">
        {accounts.map((account) => {
          const meta = META[account.provider];
          return (
            <div key={account.provider} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", meta.wrap)}>
                  {meta.svg}
                </div>
                <div>
                  <p className="text-sm font-semibold">{meta.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {account.connected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "text-sm font-semibold",
                  account.connected ? "text-primary" : "text-on-surface-variant",
                )}
              >
                {account.connected ? "Linked" : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
