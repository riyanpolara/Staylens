"use client";

/**
 * Razorpay Checkout launcher (browser).
 *
 * Loads Razorpay's hosted script on demand and opens the standard Checkout
 * modal. We deliberately do NOT build a card form: card details are entered
 * inside Razorpay's own iframe and never touch StayLens code, which is what
 * keeps the integration out of PCI scope.
 */

/* Razorpay attaches a constructor to window at runtime. */
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (payload: unknown) => void) => void;
    };
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loader: Promise<boolean> | null = null;

/** Injects the Checkout script once; repeat calls reuse the same promise. */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loader) return loader;

  loader = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(!!window.Razorpay));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve(!!window.Razorpay);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
  return loader;
}

export type CheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type OpenCheckoutParams = {
  keyId: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes?: Record<string, string>;
};

export type CheckoutOutcome =
  | { status: "success"; payload: CheckoutSuccess }
  | { status: "dismissed" }
  | { status: "failed"; error: string };

/** StayLens green — matches the site's primary. */
const THEME_COLOR = "#2d6a4f";

/**
 * Opens Checkout and resolves once the user finishes, fails, or closes it.
 * Resolving (rather than throwing) keeps the three outcomes explicit at the
 * call site, so "dismissed" isn't mistaken for an error.
 */
export function openRazorpayCheckout(
  params: OpenCheckoutParams,
): Promise<CheckoutOutcome> {
  return new Promise((resolve) => {
    if (!window.Razorpay) {
      resolve({ status: "failed", error: "Payment window failed to load." });
      return;
    }

    let settled = false;
    const done = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const rzp = new window.Razorpay({
      key: params.keyId,
      order_id: params.orderId,
      amount: params.amountMinor,
      currency: params.currency,
      name: params.name,
      description: params.description,
      prefill: params.prefill,
      notes: params.notes ?? {},
      theme: { color: THEME_COLOR },
      // Closing the modal must resolve, or the button would spin forever.
      modal: { ondismiss: () => done({ status: "dismissed" }) },
      handler: (response: CheckoutSuccess) => done({ status: "success", payload: response }),
    });

    rzp.on("payment.failed", (payload: unknown) => {
      const desc =
        (payload as { error?: { description?: string } })?.error?.description ??
        "The payment could not be completed.";
      done({ status: "failed", error: desc });
    });

    rzp.open();
  });
}
