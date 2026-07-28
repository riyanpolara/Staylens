/** Serializable data the checkout route passes to the client orchestrator. */

export type CheckoutProperty = {
  id: string;
  name: string;
  image: string | null;
  location: string;
  rating: number;
  reviewsCount: number;
  propertyType: string | null;
};

export type CheckoutTrip = {
  perNight: number;
  nights: number;
  cleaningFee: number | null;
  currency: string;
  /** yyyy-mm-dd — round-tripped to the server action */
  checkInISO: string;
  checkOutISO: string;
  /** pre-formatted display labels (e.g. "Jul 8, 2026") */
  checkInLabel: string;
  checkOutLabel: string;
  guests: { adults: number; children: number; infants: number };
};

export type GuestDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type AppliedCoupon = { code: string; label: string; discount: number };

/** Input/result contract for the `submitBooking` server action. */
export type BookingInput = {
  propertyId: string;
  checkIn: string; // yyyy-mm-dd
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  guest: GuestDetails;
  couponCode?: string | null;
};

export type BookingResult =
  | {
      ok: true;
      bookingRef: string;
      intentId: string;
      provider: string;
      total: number;
      currency: string;
    }
  | { ok: false; error: string };

export type SubmitBooking = (input: BookingInput) => Promise<BookingResult>;

/* ------------------------------------------------------------------ *
 *  Razorpay flow
 * ------------------------------------------------------------------ */

/** What the browser needs to open Razorpay Checkout. No secret is included. */
export type CreateOrderResult =
  | {
      ok: true;
      /** publishable Key ID — safe in the browser, identifies the merchant */
      keyId: string;
      orderId: string;
      /** smallest currency unit (paise), computed server-side */
      amountMinor: number;
      currency: string;
      bookingRef: string;
      prefill: { name: string; email: string; contact: string };
    }
  | { ok: false; error: string };

/** Handed back to the server after Checkout reports success. */
export type VerifyPaymentInput = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  bookingRef: string;
  /** re-sent so the server can re-price rather than trust an amount */
  booking: BookingInput;
};

export type VerifyPaymentResult =
  | {
      ok: true;
      bookingRef: string;
      total: number;
      currency: string;
      provider: string;
    }
  | { ok: false; error: string };

export type CreateOrder = (input: BookingInput) => Promise<CreateOrderResult>;
export type VerifyPayment = (
  input: VerifyPaymentInput,
) => Promise<VerifyPaymentResult>;
