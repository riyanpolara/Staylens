import { toISODate } from "@/lib/calendar";

export type BookingSelection = {
  checkIn: Date | null;
  checkOut: Date | null;
  guests: { adults: number; children: number; infants: number };
};

/**
 * Build the `/property/[id]/checkout` link carrying the chosen dates + guests,
 * so checkout opens with the same trip the guest configured. Shared by the
 * booking sidebar and the sticky sub-nav Reserve buttons.
 */
export function checkoutHref(propertyId: string, sel: BookingSelection): string {
  const qs = new URLSearchParams();
  const ci = toISODate(sel.checkIn);
  const co = toISODate(sel.checkOut);
  if (ci) qs.set("in", ci);
  if (co) qs.set("out", co);
  if (sel.guests.adults > 0) qs.set("adults", String(sel.guests.adults));
  if (sel.guests.children > 0) qs.set("children", String(sel.guests.children));
  if (sel.guests.infants > 0) qs.set("infants", String(sel.guests.infants));
  const q = qs.toString();
  return `/property/${propertyId}/checkout${q ? `?${q}` : ""}`;
}
