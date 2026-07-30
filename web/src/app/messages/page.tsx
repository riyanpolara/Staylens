import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { ProfileTopNav } from "@/components/profile/profile-top-nav";
import { ProfileFooter } from "@/components/profile/profile-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getConversations } from "@/lib/messages";
import { getProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false },
};

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.getTime() >= today.getTime()) {
    return d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en", { day: "numeric", month: "short" });
}

export default async function MessagesPage() {
  const [profile, conversations] = await Promise.all([
    getProfile(),
    getConversations(),
  ]);

  return (
    <>
      <ProfileTopNav
        avatarUrl={profile?.avatarUrl ?? ""}
        name={profile?.fullName ?? ""}
      />
      <main id="main-content" className="max-w-[760px] mx-auto px-4 md:px-16 py-16">
        <h1 className="font-display text-3xl font-semibold text-on-surface mb-8">
          Messages
        </h1>

        {conversations.length ? (
          <ul className="space-y-2">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-surface-container-low",
                    c.unread > 0 && "bg-surface-container-low",
                  )}
                >
                  <span className="relative shrink-0 size-12 rounded-full overflow-hidden bg-surface-container">
                    {c.counterpartAvatar && (
                      <Image
                        src={c.counterpartAvatar}
                        alt={c.counterpartName}
                        fill
                        sizes="48px"
                        unoptimized
                        className="object-cover"
                      />
                    )}
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "truncate",
                          c.unread > 0
                            ? "font-semibold text-on-surface"
                            : "text-on-surface",
                        )}
                      >
                        {c.counterpartName}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-on-surface-variant">
                        {when(c.lastMessageAt)}
                      </span>
                    </span>

                    {c.propertyName && (
                      <span className="block text-xs text-on-surface-variant truncate mt-0.5">
                        {c.propertyName}
                      </span>
                    )}

                    <span className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "text-sm truncate",
                          c.unread > 0
                            ? "text-on-surface font-medium"
                            : "text-on-surface-variant",
                        )}
                      >
                        {c.lastMessage ?? "No messages yet"}
                      </span>
                      {c.unread > 0 && (
                        <span className="ml-auto shrink-0 min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-primary text-white text-xs font-bold">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-white rounded-[20px] p-12 text-center shadow-tinted border border-outline-variant/10">
            <MessageSquare
              aria-hidden
              className="size-10 mx-auto text-primary"
              strokeWidth={1.8}
            />
            <p className="font-display text-xl font-semibold text-on-surface mt-4">
              No conversations yet.
            </p>
            <p className="text-sm text-on-surface-variant mt-1 max-w-sm mx-auto">
              Once you book a stay or communicate with a host, your conversations
              will appear here.
            </p>
            <Link
              href="/search"
              className="inline-block mt-6 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
            >
              Explore properties
            </Link>
          </div>
        )}
      </main>
      <ProfileFooter />
      <MobileNav active="Messages" />
    </>
  );
}
