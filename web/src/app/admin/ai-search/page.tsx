import { ChartCard, MetricCard } from "@/components/admin/ui";
import { LatencyChart } from "@/components/admin/latency-chart";
import {
  AI_EVENTS,
  AI_METRICS,
  TOP_PROMPTS,
  TRENDING_KEYWORDS,
} from "@/lib/admin/placeholder";

export const metadata = { title: "AI Search" };

export default function AdminAiSearchPage() {
  return (
    <>
      <section className="admin-section admin-grid admin-grid-kpi" aria-label="AI search metrics">
        {AI_METRICS.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} delta={m.delta} />
        ))}
      </section>

      <section className="admin-section admin-grid admin-grid-2">
        <LatencyChart />
        <ChartCard title="Trending keywords" subtitle="Fastest rising in the last 24 hours">
          <ul className="admin-legend">
            {TRENDING_KEYWORDS.map((k) => (
              <li key={k.keyword}>
                <span className="admin-legend-dot" style={{ background: "var(--color-accent-400)" }} aria-hidden />
                <span>{k.keyword}</span>
                <span className="tag tag-accent-2">{k.delta}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </section>

      <section className="admin-section">
        <ChartCard title="Top prompts" subtitle="Most frequent searches today">
          <div className="admin-table-scroll">
            <table className="table">
              <caption className="sr-only">Top prompts</caption>
              <thead>
                <tr>
                  <th scope="col">Prompt</th>
                  <th scope="col">Searches</th>
                  <th scope="col">Success rate</th>
                </tr>
              </thead>
              <tbody>
                {TOP_PROMPTS.map((p) => (
                  <tr key={p.prompt}>
                    <td>{p.prompt}</td>
                    <td className="admin-num">{p.count.toLocaleString()}</td>
                    <td className="admin-num">{p.success}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </section>

      <section className="admin-section">
        <ChartCard title="Recent search events" subtitle="Live stream sample">
          <div className="admin-table-scroll">
            <table className="table">
              <caption className="sr-only">Recent AI search events</caption>
              <thead>
                <tr>
                  <th scope="col">Prompt</th>
                  <th scope="col">Results</th>
                  <th scope="col">Latency</th>
                  <th scope="col">Tokens</th>
                  <th scope="col">Booked</th>
                </tr>
              </thead>
              <tbody>
                {AI_EVENTS.map((e) => (
                  <tr key={e.id}>
                    <td>{e.prompt}</td>
                    <td className="admin-num">{e.result_count}</td>
                    <td className="admin-num">{e.latency_ms}ms</td>
                    <td className="admin-num">{e.embedding_tokens}</td>
                    <td>
                      <span className={`tag ${e.booked ? "tag-accent-2" : "tag-neutral"}`}>
                        {e.booked ? "yes" : "no"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </section>
    </>
  );
}
