/**
 * Payment types shaped to match Stripe's PaymentIntent so the mock provider
 * and a real Stripe integration are interchangeable downstream.
 */

export type PaymentIntentStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "processing"
  | "succeeded"
  | "canceled";

export type PaymentIntent = {
  id: string;
  /** passed to the client so Stripe Elements can confirm the payment */
  clientSecret: string;
  /** amount in the currency's minor units (e.g. cents) */
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  provider: "mock" | "stripe";
};

export type CreatePaymentIntentInput = {
  /** amount in minor units (cents) */
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
};
