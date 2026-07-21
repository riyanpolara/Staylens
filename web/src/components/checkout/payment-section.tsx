"use client";

import { useEffect, useState } from "react";
import { CreditCard, Lock } from "lucide-react";

/**
 * Payment section.
 *
 * STRIPE-READY: in production the card block below is replaced by Stripe
 * Elements (`<PaymentElement/>` from @stripe/react-stripe-js), mounted with the
 * `clientSecret` returned by the `createPaymentIntent` provider. Card data then
 * goes straight to Stripe and never touches our server or this component's
 * state. For now these are inert inputs so the flow can be demoed; card values
 * are kept locally and never submitted anywhere.
 */
export function PaymentSection({
  onValidChange,
  disabled,
}: {
  onValidChange: (valid: boolean) => void;
  disabled?: boolean;
}) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [zip, setZip] = useState("");

  const digits = number.replace(/\D/g, "");
  const valid =
    digits.length >= 15 &&
    /^\d{2}\s*\/\s*\d{2}$/.test(expiry) &&
    cvc.replace(/\D/g, "").length >= 3 &&
    name.trim().length > 1;

  useEffect(() => {
    onValidChange(valid);
  }, [valid, onValidChange]);

  return (
    <section aria-labelledby="payment-heading">
      <div className="flex items-center justify-between mb-1">
        <h2 id="payment-heading" className="font-display text-xl md:text-2xl font-semibold text-primary">
          Pay with card
        </h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
          <Lock aria-hidden className="size-3.5 text-primary" />
          Secure
        </span>
      </div>
      <p className="text-on-surface-variant text-sm mb-5">
        Test mode — no real card is charged.
      </p>

      <fieldset
        disabled={disabled}
        className="rounded-2xl border border-outline-variant bg-surface overflow-hidden disabled:opacity-60"
      >
        {/* Stripe Elements <PaymentElement/> mounts here when configured. */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-outline-variant">
          <CreditCard aria-hidden className="size-5 text-on-surface-variant shrink-0" />
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="Card number"
            value={formatCardNumber(number)}
            onChange={(e) => setNumber(e.target.value)}
            className="flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/70"
          />
        </div>
        <div className="grid grid-cols-2">
          <input
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            className="h-14 px-4 bg-transparent outline-none border-r border-outline-variant text-on-surface placeholder:text-on-surface-variant/70"
          />
          <input
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="CVC"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="h-14 px-4 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/70"
          />
        </div>
        <input
          autoComplete="cc-name"
          placeholder="Name on card"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-14 px-4 bg-transparent outline-none border-t border-outline-variant text-on-surface placeholder:text-on-surface-variant/70"
        />
        <input
          autoComplete="postal-code"
          placeholder="ZIP / Postal code"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          className="w-full h-14 px-4 bg-transparent outline-none border-t border-outline-variant text-on-surface placeholder:text-on-surface-variant/70"
        />
      </fieldset>
    </section>
  );
}

function formatCardNumber(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)} / ${d.slice(2)}`;
}
