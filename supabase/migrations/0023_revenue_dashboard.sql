-- ===========================================================================
-- 0023_revenue_dashboard.sql
-- Backend for the /admin/revenue screen: every figure aggregated in Postgres
-- and returned by a single RPC, so nothing is summed in the browser.
--
-- WHAT THE DATA COULD AND COULD NOT ALREADY ANSWER
--
-- `bookings` stores `total_price` (the gross the guest paid), `paid_at`,
-- `payment_status` and `status`. That is enough for gross revenue, the time
-- series, average booking value and refunds — `payment_status_enum` already has
-- a 'refunded' value, so refunds are representable even though none exist yet.
--
-- It was NOT enough for platform commission, taxes or host payouts:
--
--   * `commission` exists but is NULL on every row — nothing ever wrote it.
--   * There is no tax column, and no payouts table.
--   * `nightly_price` and `cleaning_fee` are NULL on the Razorpay bookings, so
--     the room subtotal cannot be recovered after the fact.
--
-- lib/pricing.ts is the authority on the split:
--
--   serviceFee   = round(roomTotal * 0.12)      <- the platform's commission
--   taxableBase  = roomTotal + cleaningFee + serviceFee - discount
--   taxes        = round(taxableBase * 0.08)
--   total        = taxableBase + taxes
--
-- From that, tax IS exactly recoverable from the total alone:
--
--   taxableBase = total / 1.08   ->   tax = total * 0.08/1.08
--
-- Commission is not: it needs roomTotal, which needs the cleaning fee. So this
-- migration adds the columns, backfills tax exactly, and deliberately leaves
-- commission and host payout NULL on the three historical rows rather than
-- inventing a plausible number. The application now writes all three at booking
-- time, and the RPC reports how much of the range has a known commission so a
-- partially-known figure can never be read as a complete one.
--
-- Safe to run more than once. Requires public.is_admin() from 0013_admin_rls.
-- ===========================================================================

do $$
begin
  if to_regprocedure('public.is_admin(uuid)') is null then
    raise exception
      '0023_revenue_dashboard.sql requires public.is_admin(uuid). Apply 0013_admin_rls.sql first.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. The money columns the ledger needs.
--
--    `commission` already existed (unused); it is the platform service fee.
--    Rates are stored per row, not read from a constant at query time, so a
--    future rate change cannot silently rewrite history.
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists tax_amount      numeric(12,2),
  add column if not exists host_payout     numeric(12,2),
  add column if not exists commission_rate numeric(5,4),
  add column if not exists tax_rate        numeric(5,4),
  add column if not exists refunded_amount numeric(12,2),
  add column if not exists refunded_at     timestamptz;

comment on column public.bookings.commission is
  'Platform service fee in the booking currency. NULL on rows created before 0023.';
comment on column public.bookings.tax_amount is
  'Occupancy tax in the booking currency. Backfilled exactly from total_price.';
comment on column public.bookings.host_payout is
  'total_price - commission - tax_amount. NULL where commission is unknown.';
comment on column public.bookings.commission_rate is
  'Rate in force when the booking was taken, so a rate change cannot rewrite history.';

-- Tax, recovered exactly. Only for rows priced under the 0.08 rate — every
-- existing row was, and `tax_rate` records that fact for the ones we touch.
update public.bookings
   set tax_amount = round(total_price * 0.08 / 1.08, 2),
       tax_rate   = 0.08
 where tax_amount is null
   and total_price is not null;

-- Payout is only meaningful once commission is known; where it is not, leave
-- both NULL so the dashboard can say so instead of overstating what hosts earn.
update public.bookings
   set host_payout = round(total_price - commission - coalesce(tax_amount, 0), 2)
 where host_payout is null
   and commission is not null
   and total_price is not null;

-- ---------------------------------------------------------------------------
-- 2. Indexes.
--
--    Revenue is recognised when money moves, so every query in the RPC filters
--    `payment_status = 'paid'` and buckets on `paid_at`. A partial index on
--    exactly that predicate keeps the scan proportional to paid bookings rather
--    than to the whole table, and carries total_price so the sums are index-only.
--
--    Refunds are a much smaller set and get their own partial index.
--
--    Nothing else is added: `idx_bookings_guest` (0020) and the property FK
--    index already serve the joins the by-city and by-type breakdowns need.
-- ---------------------------------------------------------------------------
create index if not exists idx_bookings_paid_at
  on public.bookings (paid_at, total_price)
  where payment_status = 'paid';

create index if not exists idx_bookings_refunded
  on public.bookings (refunded_at)
  where payment_status = 'refunded';

-- ---------------------------------------------------------------------------
-- 3. One RPC for the whole screen.
--
--    Ten KPIs and four chart series in a single round trip. Splitting them would
--    mean fourteen calls that can disagree with each other — a KPI computed at
--    12:00:01 next to a chart computed at 12:00:02 is a support ticket.
--
--    `p_bucket` controls the granularity of the trend series only; the KPIs are
--    always day/week/month/year to date, which is what those words mean on a
--    dashboard.
-- ---------------------------------------------------------------------------
create or replace function public.admin_revenue_dashboard(
  p_from   date default null,
  p_to     date default null,
  p_bucket text default 'day'
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_to     date := coalesce(p_to, current_date);
  v_from   date := coalesce(p_from, v_to - interval '29 days');
  v_bucket text := lower(btrim(coalesce(p_bucket, 'day')));
  v_trunc  text;
  v_result json;
begin
  if not public.is_admin() then
    raise exception 'admin_revenue_dashboard: forbidden' using errcode = '42501';
  end if;

  -- Fixed vocabulary; an unknown value falls back rather than reaching date_trunc.
  v_trunc := case v_bucket
               when 'week'  then 'week'
               when 'month' then 'month'
               when 'year'  then 'year'
               else 'day'
             end;

  if v_from > v_to then
    v_from := v_to;
  end if;

  with
  -- Money actually collected. `paid_at` rather than created_at: revenue is
  -- recognised when it is paid, not when the booking was made.
  paid as (
    select b.id, b.paid_at, b.total_price, b.commission, b.tax_amount,
           b.host_payout, b.property_id, b.nights
      from public.bookings b
     where b.payment_status = 'paid'
       and b.paid_at is not null
  ),
  in_range as (
    select * from paid
     where paid_at >= v_from::timestamptz
       and paid_at <  (v_to + 1)::timestamptz
  ),
  refunds as (
    select coalesce(sum(coalesce(b.refunded_amount, b.total_price)), 0)::numeric as amount,
           count(*)::int                                                        as count
      from public.bookings b
     where b.payment_status = 'refunded'
       and coalesce(b.refunded_at, b.updated_at) >= v_from::timestamptz
       and coalesce(b.refunded_at, b.updated_at) <  (v_to + 1)::timestamptz
  ),
  -- Period totals. Computed off `paid` (not `in_range`) because "revenue this
  -- month" must not be clipped by whatever window the admin is looking at.
  periods as (
    select
      coalesce(sum(total_price) filter (where paid_at >= date_trunc('day',   now())), 0)::numeric as day,
      coalesce(sum(total_price) filter (where paid_at >= date_trunc('week',  now())), 0)::numeric as week,
      coalesce(sum(total_price) filter (where paid_at >= date_trunc('month', now())), 0)::numeric as month,
      coalesce(sum(total_price) filter (where paid_at >= date_trunc('year',  now())), 0)::numeric as year
      from paid
  ),
  totals as (
    select
      coalesce(sum(total_price), 0)::numeric                as gross,
      coalesce(sum(commission), 0)::numeric                 as commission,
      coalesce(sum(tax_amount), 0)::numeric                 as taxes,
      coalesce(sum(host_payout), 0)::numeric                as payouts,
      count(*)::int                                         as bookings,
      -- Coverage: how many of these rows actually know their commission. Without
      -- this the commission and payout figures would look complete when they are
      -- not (see the note at the top of this file).
      count(commission)::int                                as commission_known,
      coalesce(round(avg(total_price), 2), 0)::numeric       as avg_booking_value,
      coalesce(round(avg(nights), 1), 0)::numeric            as avg_nights
      from in_range
  ),
  -- Trend. generate_series supplies the empty buckets, so a day with no sales
  -- is a zero in the line rather than a gap the chart silently closes up.
  buckets as (
    select generate_series(
             date_trunc(v_trunc, v_from::timestamptz),
             date_trunc(v_trunc, v_to::timestamptz),
             ('1 ' || v_trunc)::interval
           ) as bucket
  ),
  trend as (
    select b.bucket,
           coalesce(sum(r.total_price), 0)::numeric  as revenue,
           coalesce(sum(r.commission), 0)::numeric   as commission,
           count(r.id)::int                          as bookings
      from buckets b
      left join in_range r
             on date_trunc(v_trunc, r.paid_at) = b.bucket
     group by b.bucket
  ),
  by_city as (
    select coalesce(nullif(btrim(p.city), ''), 'Unknown') as city,
           coalesce(p.country, '')                        as country,
           sum(r.total_price)::numeric                    as revenue,
           count(*)::int                                  as bookings
      from in_range r
      join public.properties p on p.id = r.property_id
     group by 1, 2
     order by revenue desc
     limit 10
  ),
  by_type as (
    select coalesce(nullif(btrim(p.property_type), ''), 'Unknown') as property_type,
           sum(r.total_price)::numeric                             as revenue,
           count(*)::int                                           as bookings
      from in_range r
      join public.properties p on p.id = r.property_id
     group by 1
     order by revenue desc
     limit 8
  ),
  -- Booking-value distribution. Fixed bands rather than width_bucket over the
  -- observed range, so the buckets mean the same thing week to week.
  distribution as (
    select band, lo, hi, count(r.id)::int as bookings,
           coalesce(sum(r.total_price), 0)::numeric as revenue
      from (values
              ('Under ₹10k',      0::numeric,      10000::numeric),
              ('₹10k–25k',        10000::numeric,  25000::numeric),
              ('₹25k–50k',        25000::numeric,  50000::numeric),
              ('₹50k–1L',         50000::numeric,  100000::numeric),
              ('₹1L–2.5L',        100000::numeric, 250000::numeric),
              ('₹2.5L and above', 250000::numeric, null::numeric)
           ) as bands(band, lo, hi)
      left join in_range r
             on r.total_price >= bands.lo
            and (bands.hi is null or r.total_price < bands.hi)
     group by band, lo, hi
     order by lo
  )
  select json_build_object(
    'range', json_build_object('from', v_from, 'to', v_to, 'bucket', v_trunc),
    'periods', (select json_build_object(
                         'day', day, 'week', week, 'month', month, 'year', year)
                  from periods),
    'totals', (select json_build_object(
                        'gross',             t.gross,
                        'commission',        t.commission,
                        'taxes',             t.taxes,
                        'payouts',           t.payouts,
                        'net',               t.gross - r.amount,
                        'refunds',           r.amount,
                        'refund_count',      r.count,
                        'bookings',          t.bookings,
                        'commission_known',  t.commission_known,
                        'avg_booking_value', t.avg_booking_value,
                        'avg_nights',        t.avg_nights)
                 from totals t cross join refunds r),
    'trend', coalesce((select json_agg(json_build_object(
                                'bucket',     to_char(bucket, 'YYYY-MM-DD'),
                                'revenue',    revenue,
                                'commission', commission,
                                'bookings',   bookings)
                              order by bucket)
                         from trend), '[]'::json),
    'by_city', coalesce((select json_agg(json_build_object(
                                  'city', city, 'country', country,
                                  'revenue', revenue, 'bookings', bookings)
                                order by revenue desc)
                           from by_city), '[]'::json),
    'by_property_type', coalesce((select json_agg(json_build_object(
                                           'property_type', property_type,
                                           'revenue', revenue, 'bookings', bookings)
                                         order by revenue desc)
                                    from by_type), '[]'::json),
    'value_distribution', coalesce((select json_agg(json_build_object(
                                             'band', band, 'bookings', bookings,
                                             'revenue', revenue)
                                           order by lo)
                                      from distribution), '[]'::json)
  ) into v_result;

  return v_result;
end;
$fn$;

revoke all on function public.admin_revenue_dashboard(date, date, text) from public, anon;
grant execute on function public.admin_revenue_dashboard(date, date, text) to authenticated;
