"use client";

import { BarChart, ChartCard } from "@/components/admin/ui";
import type { BookingsPoint } from "@/lib/admin/dashboard";

/** Confirmed vs cancelled bookings per month, from live data. */
export function BookingsChart({ series }: { series: BookingsPoint[] }) {
  const confirmed = series.reduce((s, p) => s + Number(p.confirmed ?? 0), 0);
  const cancelled = series.reduce((s, p) => s + Number(p.cancelled ?? 0), 0);

  return (
    <ChartCard
      title="Bookings"
      subtitle="Confirmed vs cancelled"
      footer={
        <>
          <span>
            <span
              className="admin-legend-dot"
              style={{ background: "var(--color-accent-500)", display: "inline-block", marginInlineEnd: 6 }}
            />
            {confirmed.toLocaleString()} confirmed
          </span>
          <span className="text-muted">
            <span
              className="admin-legend-dot"
              style={{ background: "var(--color-neutral-400)", display: "inline-block", marginInlineEnd: 6 }}
            />
            {cancelled.toLocaleString()} cancelled
          </span>
        </>
      }
    >
      <BarChart
        data={series.map((p) => ({
          label: p.label,
          confirmed: Number(p.confirmed ?? 0),
          cancelled: Number(p.cancelled ?? 0),
        }))}
      />
    </ChartCard>
  );
}
