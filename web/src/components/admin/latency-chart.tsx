"use client";

import { useState } from "react";
import { AreaChart, ChartCard, Segmented } from "@/components/admin/ui";
import { AI_LATENCY_SERIES } from "@/lib/admin/placeholder";

const RANGES = ["24h", "7d", "30d"];

/** Average AI search response time. Range is a placeholder until the
 *  admin_ai_overview RPC lands (see handoff-spec.md). */
export function LatencyChart() {
  const [range, setRange] = useState("24h");
  return (
    <ChartCard
      title="Response time"
      subtitle="Average end-to-end search latency"
      actions={<Segmented options={RANGES} value={range} onChange={setRange} />}
      footer={<span className="text-muted">p95 and no-result counts arrive with the analytics RPC.</span>}
    >
      <AreaChart
        data={AI_LATENCY_SERIES.map((p) => p.value)}
        labels={AI_LATENCY_SERIES.map((p) => p.label)}
      />
    </ChartCard>
  );
}
