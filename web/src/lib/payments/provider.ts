import type { CreatePaymentIntentInput, PaymentIntent } from "./types";

/**
 * Payment provider boundary (server-only — call from Server Actions / route
 * handlers, never the client).
 *
 * Today this returns a MOCK PaymentIntent so the checkout UI can be driven
 * end-to-end without charging anyone. The return shape already matches
 * Stripe's PaymentIntent, so enabling real payments is a drop-in:
 *
 *   1. `npm i stripe`
 *   2. set STRIPE_SECRET_KEY (server) + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (client)
 *   3. uncomment the Stripe block below.
 *
 * Card data never reaches this function in either mode: with Stripe, the card
 * is tokenized client-side by Elements and only the clientSecret round-trips.
 */
export async function createPaymentIntent(
  input: CreatePaymentIntentInput,
): Promise<PaymentIntent> {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (secretKey) {
    // --- Real Stripe integration (drop-in) --------------------------------
    // const Stripe = (await import("stripe")).default;
    // const stripe = new Stripe(secretKey);
    // const intent = await stripe.paymentIntents.create({
    //   amount: input.amount,
    //   currency: input.currency,
    //   automatic_payment_methods: { enabled: true },
    //   metadata: input.metadata,
    // });
    // return {
    //   id: intent.id,
    //   clientSecret: intent.client_secret!,
    //   amount: intent.amount,
    //   currency: intent.currency,
    //   status: intent.status as PaymentIntent["status"],
    //   provider: "stripe",
    // };
    // ----------------------------------------------------------------------
  }

  // Mock intent — no network, no charge.
  const id = `pi_mock_${randomId(16)}`;
  return {
    id,
    clientSecret: `${id}_secret_${randomId(20)}`,
    amount: input.amount,
    currency: input.currency,
    status: "requires_payment_method",
    provider: "mock",
  };
}

function randomId(len: number): string {
  let s = "";
  while (s.length < len) s += Math.random().toString(36).slice(2);
  return s.slice(0, len);
}
