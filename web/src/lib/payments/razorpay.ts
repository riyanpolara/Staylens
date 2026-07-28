import "server-only";
import crypto from "node:crypto";

/**
 * Razorpay server client.
 *
 * `import "server-only"` makes this a build error if it is ever pulled into a
 * client bundle — the secret key must never reach the browser. Only the Key ID
 * (NEXT_PUBLIC_RAZORPAY_KEY_ID) is public, which is exactly what Razorpay
 * intends: it identifies the merchant, it does not authorise anything.
 *
 * Implemented against Razorpay's REST API with fetch rather than the `razorpay`
 * npm package — two endpoints and an HMAC don't justify a dependency, and this
 * keeps the bundle and the audit surface small.
 */

const API = "https://api.razorpay.com/v1";

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  /** true when the key is a test-mode key (rzp_test_*). */
  isTestMode: boolean;
};

export type RazorpayOrder = {
  id: string;
  amount: number; // paise
  currency: string;
  status: string;
  receipt?: string;
};

/** Reads and validates credentials. Returns null when not configured. */
export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, isTestMode: keyId.startsWith("rzp_test_") };
}

function authHeader({ keyId, keySecret }: RazorpayConfig): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

/**
 * Creates an order. `amountMinor` is in the currency's smallest unit
 * (paise for INR) and MUST be computed server-side from authoritative data —
 * never taken from the client, or a user could pay ₹1 for a ₹40,000 stay.
 */
export async function createRazorpayOrder(params: {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<
  { ok: true; order: RazorpayOrder } | { ok: false; error: string }
> {
  const cfg = getRazorpayConfig();
  if (!cfg) return { ok: false, error: "Payments are not configured." };

  if (!Number.isInteger(params.amountMinor) || params.amountMinor < 100) {
    // Razorpay rejects amounts under 1 unit; catch it before the round trip.
    return { ok: false, error: "That amount is too small to charge." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: {
        Authorization: authHeader(cfg),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amountMinor,
        currency: params.currency.toUpperCase(),
        receipt: params.receipt.slice(0, 40), // Razorpay caps receipt length
        notes: params.notes ?? {},
        payment_capture: 1,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const body = (await res.json().catch(() => null)) as
      | (RazorpayOrder & { error?: { description?: string } })
      | null;

    if (!res.ok || !body?.id) {
      const detail = body?.error?.description ?? `HTTP ${res.status}`;
      console.error("[razorpay] order creation failed:", detail);
      return { ok: false, error: "Couldn't start the payment. Please try again." };
    }
    return { ok: true, order: body };
  } catch (err) {
    const aborted = controller.signal.aborted;
    console.error("[razorpay] order creation error:", aborted ? "timeout" : err);
    return {
      ok: false,
      error: aborted
        ? "The payment provider timed out. Please try again."
        : "Couldn't reach the payment provider.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verifies the Checkout callback signature.
 *
 * Razorpay signs `order_id|payment_id` with the key secret (HMAC-SHA256). This
 * is the ONLY proof that a payment really happened — the browser's success
 * callback is attacker-controlled and must never be trusted on its own.
 * Compared in constant time so the check can't be probed byte-by-byte.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const cfg = getRazorpayConfig();
  if (!cfg) return false;

  const expected = crypto
    .createHmac("sha256", cfg.keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(params.signature ?? "", "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Re-reads the payment from Razorpay. Belt-and-braces after signature
 * verification: confirms the gateway itself agrees the payment is captured and
 * that the amount matches what we asked for, so a valid signature replayed with
 * a different order can't slip through.
 */
export async function fetchRazorpayPayment(
  paymentId: string,
): Promise<
  | { ok: true; status: string; amount: number; currency: string; orderId: string }
  | { ok: false; error: string }
> {
  const cfg = getRazorpayConfig();
  if (!cfg) return { ok: false, error: "Payments are not configured." };

  try {
    const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: authHeader(cfg) },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as {
      status?: string;
      amount?: number;
      currency?: string;
      order_id?: string;
    } | null;

    if (!res.ok || !body?.status) {
      return { ok: false, error: "Couldn't confirm the payment." };
    }
    return {
      ok: true,
      status: body.status,
      amount: body.amount ?? 0,
      currency: body.currency ?? "INR",
      orderId: body.order_id ?? "",
    };
  } catch (err) {
    console.error("[razorpay] payment fetch failed:", err);
    return { ok: false, error: "Couldn't confirm the payment." };
  }
}
