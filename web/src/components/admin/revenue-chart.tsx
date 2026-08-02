"use client";

import { useState } from "react";
import { AreaChart, ChartCard, Segmented } from "@/components/admin/ui";
import { formatInr } from "@/lib/currency";
import type { RevenuePoint } from "@/lib/admin/dashboard";

const RANGES = ["3m", "6m", "12m"] as const;
const TAIL: Record<string, number> = { "3m": 3, "6m": 6, "12m": 12 };

/**
 * Revenue over time, from live booking data.
 *
 * The server sends 12 months in one payload; switching range slices that
 * client-side rather than issuing another query.
 */
export function RevenueChart({ series }: { series: RevenuePoint[] }) {
  const [range, setRange] = useState<string>("12m");
  const points = series.slice(-TAIL[range]);

  const total = points.reduce((s, p) => s + Number(p.value ?? 0), 0);

  return (
    <ChartCard
      title="Revenue"
      subtitle="Gross booking value, cancellations excluded"
      actions={<Segmented options={[...RANGES]} value={range} onChange={setRange} />}
      footer={
        <span className="text-muted">
          {points.length} month{points.length === 1 ? "" : "s"} ·{" "}
          {formatInr(total)} total
        </span>
      }
    >
      <AreaChart
        data={points.map((p) => Number(p.value ?? 0))}
        labels={points.map((p) => p.label)}
      />
    </ChartCard>
  );
}
