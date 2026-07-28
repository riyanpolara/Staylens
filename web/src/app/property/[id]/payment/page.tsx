import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { PaymentClient } from "@/components/payment/payment-client";
import { createBookingOrder, verifyAndCreateBooking } from "../checkout/payment-actions";
import type { CheckoutProperty, CheckoutTrip } from "@/components/checkout/checkout-types";
import { getPropertyDetail } from "@/lib/queries";
import { nightsBetween, parseISODate, toISODate } from "@/lib/calendar";

/**
 * Payment — the final step of the reservation flow.
 *
 *   /property/[id]  →  /property/[id]/checkout  →  /property/[id]/payment
 *      (listing)          (confirm and pay)           (this page → Razorpay)
 *
 * Dates and guest counts arrive in the URL, so the page is linkable and
 * refresh-safe. Guest contact details deliberately do NOT travel in the query
 * string — they are handed over in sessionStorage by the checkout step, because
 * putting a name, email and phone in a URL leaks them into history, logs and
 * referrers.
 */

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
    title: p ? `Payment · ${p.name}` : "Payment",
    robots: { index: false },
  };
}

export default async function PaymentPage({
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
    console.error("[payment] getPropertyDetail failed:", err);
    property = null;
  }
  if (!property) notFound();

  const checkIn = parseISODate(one(sp.in));
  const checkOut = parseISODate(one(sp.out));
  const nights = nightsBetween(checkIn, checkOut);
  if (!checkIn || !checkOut || nights <= 0) redirect(`/property/${id}`);

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

  const reservationHref = `/property/${id}/checkout?${new URLSearchParams({
    in: trip.checkInISO,
    out: trip.checkOutISO,
    adults: String(trip.guests.adults),
    ...(trip.guests.children ? { children: String(trip.guests.children) } : {}),
    ...(trip.guests.infants ? { infants: String(trip.guests.infants) } : {}),
  }).toString()}`;

  return (
    <>
      <CheckoutHeader backHref={reservationHref} />
      <main
        id="main-content"
        className="max-w-[1120px] mx-auto px-4 md:px-16 py-8 md:py-12 pb-24"
      >
        <PaymentClient
          property={cp}
          trip={trip}
          propertyHref={`/property/${id}`}
          reservationHref={reservationHref}
          createOrder={createBookingOrder}
          verifyPayment={verifyAndCreateBooking}
        />
      </main>
    </>
  );
}
