import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProfileTopNav } from "@/components/profile/profile-top-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThreadClient } from "@/components/messages/thread-client";
import { getConversation } from "@/lib/messages";
import { getProfile } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false },
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, conversation] = await Promise.all([
    getProfile(),
    getConversation(id),
  ]);

  // RLS hides threads that are not yours, so "not yours" and "not found" are
  // deliberately indistinguishable from the outside.
  if (!conversation) notFound();

  return (
    <>
      <ProfileTopNav
        avatarUrl={profile?.avatarUrl ?? ""}
        name={profile?.fullName ?? ""}
        email={profile?.email ?? ""}
      />
      <main id="main-content" className="max-w-[760px] mx-auto px-4 md:px-16 py-8 md:py-12">
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft aria-hidden className="size-4" />
          All messages
        </Link>

        <header className="flex items-center gap-4 pb-6 border-b border-outline-variant/20">
          <span className="relative shrink-0 size-12 rounded-full overflow-hidden bg-surface-container">
            {conversation.counterpartAvatar && (
              <Image
                src={conversation.counterpartAvatar}
                alt={conversation.counterpartName}
                fill
                sizes="48px"
                unoptimized
                className="object-cover"
              />
            )}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold text-on-surface truncate">
              {conversation.counterpartName}
            </h1>
            <p className="text-sm text-on-surface-variant truncate">
              {conversation.propertyId && conversation.propertyName ? (
                <Link
                  href={`/property/${conversation.propertyId}`}
                  className="hover:underline"
                >
                  {conversation.propertyName}
                </Link>
              ) : (
                conversation.propertyName
              )}
              {conversation.bookingRef && (
                <>
                  {" · "}
                  <span className="font-mono text-xs">{conversation.bookingRef}</span>
                </>
              )}
            </p>
          </div>
        </header>

        <ThreadClient
          conversationId={conversation.id}
          initialMessages={conversation.messages}
          canSend
          hostCanReply={conversation.hostCanReply}
        />
      </main>
      <MobileNav active="Messages" />
    </>
  );
}
