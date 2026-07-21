"use client";

import { useState } from "react";
import { BadgeCheck, Tag, X } from "lucide-react";
import { formatMoney } from "@/lib/pricing";
import type { AppliedCoupon } from "@/components/checkout/checkout-types";

/** Coupon entry — applied state shows a removable chip; errors show inline. */
export function CouponField({
  applied,
  error,
  currency,
  onApply,
  onRemove,
}: {
  applied: AppliedCoupon | null;
  error: string | null;
  currency: string;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const [code, setCode] = useState("");

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary-fixed/30 px-4 py-3">
        <span className="flex items-center gap-2 min-w-0">
          <BadgeCheck aria-hidden className="size-5 text-primary shrink-0" />
          <span className="min-w-0">
            <span className="font-semibold text-primary">{applied.code}</span>
            <span className="text-on-surface-variant text-sm"> — {applied.label}</span>
          </span>
        </span>
        <span className="flex items-center gap-3 shrink-0">
          <span className="font-semibold text-primary whitespace-nowrap">
            −{formatMoney(applied.discount, currency)}
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove coupon"
            className="w-7 h-7 rounded-full border border-outline-variant/60 flex items-center justify-center hover:border-on-surface hover:bg-surface-container transition-colors"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </span>
      </div>
    );
  }

  const submit = () => {
    if (code.trim()) onApply(code);
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag
            aria-hidden
            className="size-4 text-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2"
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
            placeholder="Coupon code"
            aria-label="Coupon code"
            className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface border border-outline-variant text-on-surface uppercase placeholder:normal-case placeholder:text-on-surface-variant/70 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!code.trim()}
          className="px-5 h-12 rounded-xl border-[1.5px] border-primary text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary"
        >
          Apply
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
      <p className="text-xs text-on-surface-variant mt-1.5">
        Try <span className="font-semibold">STAYLENS10</span>,{" "}
        <span className="font-semibold">WELCOME25</span> or{" "}
        <span className="font-semibold">NATURE50</span>.
      </p>
    </div>
  );
}
