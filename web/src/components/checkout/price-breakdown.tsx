import { formatMoney, nightsLabel, type BookingBreakdown } from "@/lib/pricing";

/** Reusable itemized price list — used in the summary card and confirmation. */
export function PriceBreakdown({ breakdown }: { breakdown: BookingBreakdown }) {
  const { currency } = breakdown;
  const money = (n: number) => formatMoney(n, currency);
  const taxPct = Math.round(breakdown.taxRate * 100);

  return (
    <div className="space-y-3 text-sm">
      <Row
        label={`${money(breakdown.perNight)} ${nightsLabel(breakdown.nights)}`}
        value={money(breakdown.roomTotal)}
        underline
      />
      {breakdown.cleaningFee > 0 && (
        <Row label="Cleaning fee" value={money(breakdown.cleaningFee)} underline />
      )}
      <Row label="Staylens service fee" value={money(breakdown.serviceFee)} underline />
      {breakdown.discount > 0 && (
        <Row
          label={`Coupon${breakdown.couponCode ? ` (${breakdown.couponCode})` : ""}`}
          value={`−${money(breakdown.discount)}`}
          accent
        />
      )}
      <Row label={`Taxes (${taxPct}%)`} value={money(breakdown.taxes)} underline />
      <hr className="border-outline-variant/40 my-1" />
      <div className="flex justify-between items-center font-display text-lg font-semibold text-primary">
        <span>Total {currency !== "USD" ? `(${currency})` : ""}</span>
        <span>{money(breakdown.total)}</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  underline,
  accent,
}: {
  label: string;
  value: string;
  underline?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={underline ? "text-on-surface-variant underline" : "text-on-surface-variant"}>
        {label}
      </span>
      <span className={accent ? "text-primary-container font-semibold whitespace-nowrap" : "whitespace-nowrap"}>
        {value}
      </span>
    </div>
  );
}
