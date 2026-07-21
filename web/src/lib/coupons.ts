/**
 * Demo coupon catalog. In production this would be a table / promo service;
 * the shape here (validate → discount amount) is what the checkout and the
 * server action both depend on, so swapping the source is a one-file change.
 */

export type Coupon = {
  code: string;
  label: string;
  kind: "percent" | "flat";
  /** percent (0–100) when kind="percent", else a flat amount in currency units */
  value: number;
  /** only redeemable on stays of at least this many nights */
  minNights?: number;
};

const CATALOG: Record<string, Coupon> = {
  STAYLENS10: { code: "STAYLENS10", label: "10% off your stay", kind: "percent", value: 10 },
  WELCOME25: { code: "WELCOME25", label: "$25 welcome credit", kind: "flat", value: 25 },
  NATURE50: { code: "NATURE50", label: "$50 off stays of 5+ nights", kind: "flat", value: 50, minNights: 5 },
};

export type CouponResult =
  | { ok: true; code: string; label: string; discount: number }
  | { ok: false; error: string };

/**
 * Validate a coupon against the room subtotal. Discount is rounded and never
 * exceeds the room subtotal. Pure — safe to run on client (live preview) and
 * server (authoritative re-check).
 */
export function validateCoupon(
  rawCode: string,
  roomTotal: number,
  nights: number,
): CouponResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const coupon = CATALOG[code];
  if (!coupon) return { ok: false, error: "That code isn’t valid." };
  if (coupon.minNights && nights < coupon.minNights) {
    return { ok: false, error: `Valid on stays of ${coupon.minNights}+ nights.` };
  }

  const raw = coupon.kind === "percent" ? (roomTotal * coupon.value) / 100 : coupon.value;
  const discount = Math.min(Math.round(raw), roomTotal);
  if (discount <= 0) return { ok: false, error: "This code doesn’t apply to your dates." };

  return { ok: true, code: coupon.code, label: coupon.label, discount };
}
