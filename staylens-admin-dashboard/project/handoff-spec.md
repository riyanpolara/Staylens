# StayLens Admin — design handoff

Prototype: `StayLens Admin.dc.html` (open in browser). Screens built: **Dashboard, Properties, Bookings, Users, AI Search Analytics**. The other 8 sidebar entries route to an empty-state stub that names the patterns they will reuse.

Visual system: the project's Organic design system (`_ds/organic-…/styles.css`). All color, type, radius and shadow values come from its tokens — never hard-code hexes. Dark mode is a token override on `[data-theme="dark"]`, so no component needs dark-specific styling.

---

## Layout

| Region | Behaviour |
| --- | --- |
| Sidebar | 236px expanded / 76px icon-only; collapses below 1024px, becomes an overlay drawer under 900px |
| Header | Sticky, translucent (`backdrop-filter: blur(14px)`), breadcrumb + page title, search (≥1180px), theme switch, notification bell + panel, profile |
| Content | Max-width fluid; every grid is `repeat(auto-fit, minmax(Npx, 1fr))` so tablet/mobile reflow needs no media queries |
| Tables | Rounded card-rows in a horizontal-scroll container (min-width 900–940px) |

Breakpoints in the prototype: `w < 900` mobile (drawer), `w < 1024` rail auto-collapses, `w < 1180` header search hidden.

---

## Components to build (React)

```
components/admin/
  AdminShell.tsx        sidebar + header + <main>, owns theme + rail state
  Sidebar.tsx           NavItem[]; icon-only when collapsed; badge slot
  Header.tsx            Breadcrumb, SearchCommand, ThemeToggle, NotificationBell, ProfileMenu
  NotificationPanel.tsx popover list, icon tint per notification kind
  StatCard.tsx          icon pill, label, value, delta, 120×40 sparkline; hover lift −4px
  MetricCard.tsx        compact label/value/delta (Bookings + AI screens)
  ChartCard.tsx         title, subtitle, right-aligned range <Segmented>, chart slot, footer legend
  AreaChart.tsx         smooth cubic path + gradient fill + optional dashed comparison series
  BarChart.tsx          stacked confirmed/cancelled, dims non-hovered columns
  Donut.tsx             stroke-dasharray ring
  DataTable.tsx         sortable headers, selection, bulk bar, row menu, pagination, empty state
  RowActionsMenu.tsx    view / edit / feature / suspend / delete
  ConfirmDialog.tsx     destructive confirm, copy states the consequence
  ActivityTimeline.tsx  icon rail + connector line
  HeatCalendar.tsx      7-col grid, 4 intensity steps from the accent ramp
  EmptyState.tsx        icon pill, title, body, primary + secondary action
  Skeleton.tsx          rounded blocks at the same radii as the real content
```

### Interaction rules
- **Hover lift** on cards/rows: `translateY(-2…-4px)` + shadow step up, 180–220ms.
- **Mount**: `rise` (10px up + fade) staggered 35–60ms per card/row. Charts: path `stroke-dashoffset` draw 1.1s, bars `scaleY` from baseline.
- **Charts**: hover is captured by invisible full-height `<rect>` slices, not by the visible geometry; tooltip is absolutely positioned at the point's x%. Range switch re-derives paths from the dataset.
- **Row menus / notification panel** close on outside click.
- **Destructive actions always** go through ConfirmDialog; the body copy states what is lost.
- **Focus**: never remove the design system's `:focus-visible` accent ring.

### Status → tag mapping
`Live · Active · Confirmed · Paid · Completed` → `tag-accent-2` (sage) · `Pending` → `tag-accent` (terracotta) · `Suspended · Cancelled · Banned · Refunded` → `tag-neutral`.

---

## TypeScript interfaces

```ts
type PropertyStatus = 'live' | 'pending' | 'suspended' | 'draft';
type BookingStatus  = 'confirmed' | 'pending' | 'cancelled' | 'completed';
type PaymentStatus  = 'paid' | 'pending' | 'failed' | 'refunded';
type UserRole       = 'guest' | 'host' | 'admin';
type UserStatus     = 'active' | 'pending' | 'suspended' | 'banned';

interface Property {
  id: string; title: string; type: string; host: Pick<Host,'id'|'name'>;
  city: string; country: string; price_per_night: number; currency: string;
  status: PropertyStatus; is_featured: boolean;
  rating_avg: number | null; review_count: number; booking_count: number;
  cover_image_url: string | null; created_at: string;
}

interface Host {
  id: string; user_id: string; name: string; avatar_url: string | null;
  is_verified: boolean; property_count: number; revenue_total: number;
  booking_count: number; rating_avg: number | null; response_rate: number;
  status: UserStatus; joined_at: string;
}

interface Booking {
  id: string; reference: string;                 // SL-48210
  guest: Pick<AppUser,'id'|'name'|'avatar_url'>;
  property: Pick<Property,'id'|'title'>; host: Pick<Host,'id'|'name'>;
  check_in: string; check_out: string; nights: number;
  amount_total: number; commission: number;
  status: BookingStatus; payment_status: PaymentStatus; created_at: string;
}

interface AppUser {
  id: string; name: string; email: string; avatar_url: string | null;
  country: string; role: UserRole; status: UserStatus;
  created_at: string; last_sign_in_at: string | null; booking_count: number;
}

interface AiSearchEvent {
  id: string; user_id: string | null; prompt: string;
  result_count: number; clicked_property_id: string | null;
  booked: boolean; latency_ms: number; embedding_tokens: number; created_at: string;
}

interface StatSeriesPoint { label: string; value: number; compare?: number }
interface KpiSummary { label: string; value: number; format: 'currency'|'number'|'percent'|'ms'; delta_pct: number; series: number[] }
```

---

## Supabase queries

Read-heavy widgets should hit SQL views / RPCs, not client-side aggregation.

```sql
-- KPI header (one round trip)
create or replace view admin_kpi_summary as
select
  (select count(*) from users)                                             as total_users,
  (select count(*) from properties where status = 'live')                  as live_properties,
  (select count(*) from bookings where created_at > now() - interval '30 days') as bookings_30d,
  (select coalesce(sum(amount_total),0) from bookings
     where status <> 'cancelled' and date_trunc('month', created_at) = date_trunc('month', now())) as revenue_mtd,
  (select count(*) from ai_search_events where created_at::date = current_date) as ai_searches_today;

-- Revenue series, bucketed by the range the UI asks for
create or replace function admin_revenue_series(bucket text, points int)
returns table (label text, value numeric, compare numeric) language sql stable as $$
  select to_char(date_trunc(bucket, created_at), 'Mon YY'),
         sum(amount_total),
         sum(amount_total) filter (where created_at < now() - interval '1 year')
  from bookings where status <> 'cancelled'
    and created_at > now() - (points || ' ' || bucket)::interval
  group by 1 order by min(created_at);
$$;
```

```ts
// Properties table — server-side filter + sort + page
const { data, count } = await supabase
  .from('properties')
  .select('id,title,type,city,country,price_per_night,status,is_featured,rating_avg,review_count,booking_count,cover_image_url,created_at,host:hosts(id,name)',
          { count: 'exact' })
  .ilike('title', `%${query}%`)                       // TODO: swap for an RPC doing title+host+city trigram search
  .eq(status === 'all' ? 'id' : 'status', status === 'all' ? undefined : status)
  .order(sortKey, { ascending: sortDir === 'asc' })
  .range((page - 1) * 6, page * 6 - 1);

// Bulk suspend
await supabase.from('properties').update({ status: 'suspended' }).in('id', selectedIds);

// AI analytics, last 24h
const { data: ai } = await supabase.rpc('admin_ai_overview', { window_hours: 24 });
// returns { searches, success_rate, avg_latency_ms, p95_latency_ms, no_result_count,
//           embedding_calls, top_prompts[], trending_keywords[], top_recommendations[] }
```

TODO placeholders in the prototype: cancellation rate, occupancy rate, host response rate, arrivals-calendar density and the trending-keyword deltas are computed values — they need `admin_occupancy_daily` and `admin_keyword_trends` materialized views before the widgets go live. All figures currently shown are realistic dummy data.

### States
- **Loading** — Skeleton at the real radii; charts render an empty axis, not a spinner.
- **Empty** — EmptyState with the filter-clearing action (see Properties/Users).
- **Error** — same shell as EmptyState, `tag-accent` icon pill, body naming the failed resource + a Retry button.
- **RBAC** — nav items and row actions are filtered by `role in ('admin','moderator','analyst')`; a moderator sees Reviews/Reports but no Settings or Revenue.
