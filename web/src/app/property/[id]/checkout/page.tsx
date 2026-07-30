import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import { createBookingOrder, verifyAndCreateBooking } from "./payment-actions";
import type {
  CheckoutProperty,
  CheckoutTrip,
} from "@/components/checkout/checkout-types";
import { getPropertyDetail } from "@/lib/queries";
import { getGuestDefaults } from "@/lib/auth/guest-defaults";
import { nightsBetween, parseISODate, toISODate } from "@/lib/calendar";

const DATE_FMT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) =>
  typeof v === "string" && v.length ? v : undefined;
const posInt = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getPropertyDetail(id).catch(() => null);
  return {
    title: p ? `Confirm and pay · ${p.name}` : "Checkout",
    robots: { index: false },
  };
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  let property;
  try {
    property = await getPropertyDetail(id);
  } catch (err) {
    console.error("[checkout] getPropertyDetail failed:", err);
    property = null;
  }
  if (!property) notFound();

  const checkIn = parseISODate(one(sp.in));
  const checkOut = parseISODate(one(sp.out));
  const nights = nightsBetween(checkIn, checkOut);

  // checkout needs a valid date range — bounce back to the listing to pick dates
  if (!checkIn || !checkOut || nights <= 0) {
    redirect(`/property/${id}`);
  }

  // The proxy guarantees a session on this route, so this resolves to the
  // signed-in guest's own details.
  const initialGuest = await getGuestDefaults();

  const cp: CheckoutProperty = {
    id: property.id,
    name: property.name,
    image: property.images[0]?.url ?? null,
    location: [property.area, property.country].filter(Boolean).join(", "),
    rating: property.rating,
    reviewsCount: property.reviewsCount,
    propertyType: property.propertyType,
  };

  const trip: CheckoutTrip = {
    perNight: property.price,
    nights,
    cleaningFee: property.cleaningFee,
    currency: property.currency,
    checkInISO: toISODate(checkIn)!,
    checkOutISO: toISODate(checkOut)!,
    checkInLabel: DATE_FMT.format(checkIn),
    checkOutLabel: DATE_FMT.format(checkOut),
    guests: {
      adults: Math.max(1, posInt(sp.adults) ?? 1),
      children: posInt(sp.children) ?? 0,
      infants: posInt(sp.infants) ?? 0,
    },
  };

  return (
    <>
      <CheckoutHeader backHref={`/property/${id}`} />
      <main
        id="main-content"
        className="max-w-[1120px] mx-auto px-4 md:px-16 py-8 md:py-12 pb-24"
      >
        <CheckoutClient
          property={cp}
          trip={trip}
          initialGuest={initialGuest}
          editHref={`/property/${id}`}
          createOrder={createBookingOrder}
          verifyPayment={verifyAndCreateBooking}
        />
      </main>
    </>
  );
}
