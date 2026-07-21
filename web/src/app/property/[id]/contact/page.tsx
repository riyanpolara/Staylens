import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactHostHeader } from "@/components/contact-host/contact-host-header";
import { ContactHostProfile } from "@/components/contact-host/contact-host-profile";
import { HostConversation } from "@/components/contact-host/host-conversation";
import { HostFaq, type FaqItem } from "@/components/contact-host/host-faq";
import { HouseRules } from "@/components/contact-host/house-rules";
import { InquiryPropertyCard } from "@/components/contact-host/inquiry-property-card";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getPropertyDetail } from "@/lib/queries";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getPropertyDetail(id).catch(() => null);
  const host = p?.host?.name ?? "your host";
  return {
    title: p ? `Contact ${host}` : "Contact host",
    description: p ? `Message ${host} about ${p.name} on Staylens.` : undefined,
  };
}

const FAQ: FaqItem[] = [
  {
    q: "What are the check-in and check-out times?",
    a: "Check-in is typically from 3:00 PM and checkout is by 11:00 AM. If you need early access, please message the host in advance.",
  },
  {
    q: "Is there parking available?",
    a: "Parking availability varies by property — ask the host to confirm on-site or nearby options for your dates.",
  },
  {
    q: "What is the cancellation policy?",
    a: "Cancellation terms depend on the booking. Most stays offer a full refund if cancelled within 48 hours of booking and at least 14 days before check-in.",
  },
];

export default async function ContactHostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let property;
  try {
    property = await getPropertyDetail(id);
  } catch (err) {
    console.error("[contact-host] getPropertyDetail failed:", err);
    property = null;
  }
  if (!property) notFound();

  const host = property.host ?? {
    name: "Your host",
    about: null,
    pictureUrl: null,
    isSuperhost: false,
    identityVerified: false,
    responseRate: null,
    responseTime: null,
    listingsCount: null,
  };
  const hostName = host.name ?? "Your host";

  const participant = {
    name: hostName,
    avatarUrl: host.pictureUrl,
    subtitle: [
      host.isSuperhost ? "Superhost" : null,
      host.responseTime ? `responds ${host.responseTime}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  };

  const welcome = `Hi, I'm ${hostName}! Thanks for your interest in ${property.name}. Feel free to ask me anything about the stay, check-in, or the neighbourhood — I'm happy to help.`;

  const quickReplies = [
    "What are the check-in times?",
    "Is the space good for remote work?",
    property.amenities.some((a) => a.slug === "pets-allowed")
      ? "Can I bring my pet?"
      : "What's nearby?",
    "Is early check-in possible?",
  ];

  const location = [property.area, property.country].filter(Boolean).join(", ");

  return (
    <>
      <ContactHostHeader hostName={hostName} hostAvatar={host.pictureUrl} />
      <main id="main-content" className="max-w-[800px] mx-auto px-4 md:px-16 py-8 md:py-10 space-y-12 pb-28 md:pb-16">
        <ContactHostProfile host={host} />

        <HostConversation host={participant} welcome={welcome} quickReplies={quickReplies} />

        <HostFaq items={FAQ} />

        <HouseRules
          accommodates={property.accommodates}
          amenitySlugs={property.amenities.map((a) => a.slug)}
        />

        <InquiryPropertyCard
          id={property.id}
          name={property.name}
          image={property.images[0]?.url}
          location={location}
          price={property.price}
        />
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
