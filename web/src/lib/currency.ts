/**
 * Display-currency conversion.
 *
 * Prices are STORED in USD (they come from the Airbnb datasets) and are never
 * rewritten in the database — that keeps the door open for other display
 * currencies later. Conversion and formatting happen here, at the edge, so
 * there is exactly one place that decides what a user sees.
 *
 * The rate is a build-time constant rather than a runtime fetch on purpose:
 * server and client must format the same number identically, and an async rate
 * would produce a hydration mismatch (server renders ₹12,499, client re-renders
 * ₹12,530). To move to a live rate, fetch it in a Server Component / route
 * handler, cache it, and pass it down — the pure helpers below take a rate
 * argument for exactly that.
 */

/** USD → INR. Override with NEXT_PUBLIC_USD_TO_INR without touching code. */
export const USD_TO_INR: number = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_USD_TO_INR);
  return Number.isFinite(raw) && raw > 0 ? raw : 88;
})();

export const DISPLAY_CURRENCY = "INR" as const;

/** Converts a stored USD amount into the display currency. */
export function convertFromUsd(amountUsd: number, rate: number = USD_TO_INR): number {
  if (!Number.isFinite(amountUsd)) return 0;
  return amountUsd * rate;
}

const INR_FORMAT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Formats an amount already in INR using the Indian numbering system —
 * ₹12,499 and, past a lakh, ₹1,24,999 rather than ₹124,999.
 */
export function formatInr(amountInr: number): string {
  if (!Number.isFinite(amountInr)) return "₹0";
  return INR_FORMAT.format(Math.round(amountInr));
}

/**
 * The one function nearly every component wants: takes the stored USD figure,
 * returns a display string. `formatPrice(149)` → "₹13,112".
 */
export function formatPrice(amountUsd: number, rate: number = USD_TO_INR): string {
  return formatInr(convertFromUsd(amountUsd, rate));
}

/**
 * Compact form for dense surfaces (map pins), where a full "₹13,112" crowds the
 * marker. Uses Indian units: ₹13.1K, ₹1.2L, ₹1.4Cr.
 */
export function formatPriceCompact(amountUsd: number, rate: number = USD_TO_INR): string {
  return formatInrCompact(convertFromUsd(amountUsd, rate));
}

/**
 * Compact form for an amount that is ALREADY in rupees.
 *
 * Separate from `formatPriceCompact` because the difference is not cosmetic:
 * catalogue prices are stored in USD and must be converted, while booking
 * totals are charged and stored in INR and must not be. Passing an INR amount
 * to the USD formatter multiplies it by the exchange rate — that is how the
 * admin dashboard came to report ₹5.2Cr for ₹5.9L of bookings.
 */
export function formatInrCompact(amountInr: number): string {
  const n = Math.round(amountInr);
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `₹${n}`;
}
