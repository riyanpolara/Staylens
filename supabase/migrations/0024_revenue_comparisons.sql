-- ===========================================================================
-- 0024_revenue_comparisons.sql
-- Extends admin_revenue_dashboard for the designed Revenue screen.
--
-- The design is built around comparison: every KPI carries a delta ("+8.6% vs
-- prior day"), the trend chart draws the prior period as a dashed line, each
-- city row shows its change, and the ledger is a now/prior/change table. None of
-- that is decoration — without a prior figure those elements have nothing to
-- show. 0023 returned only current-window numbers, so this adds:
--
--   periods_prior      the equivalent day/week/month/year immediately before
--   prior              a mirror of `totals` for the window before this one
--   trend_prior        the prior window bucketed the same way, for the dashed line
--   by_city[].prior_revenue
--   median_booking_value
--
-- The prior window is the same number of days immediately preceding the current
-- one, so "last 30 days" compares against the 30 days before that. Comparing
-- against a fixed calendar period instead would make the delta jump around as
-- the month rolls over.
--
-- Everything the original returned is still returned, under the same keys.
--
-- Safe to run more than once. Requires 0023_revenue_dashboard.sql.
-- ===========================================================================

do $$
begin
  if to_regprocedure('public.admin_revenue_dashboard(date, date, text)') is null then
    raise exception
      '0024 requires admin_revenue_dashboard from 0023_revenue_dashboard.sql.';
  end if;
end $$;

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
  v_days   int;
  v_pfrom  date;
  v_pto    date;
  v_result json;
begin
  if not public.is_admin() then
    raise exception 'admin_revenue_dashboard: forbidden' using errcode = '42501';
  end if;

  v_trunc := case v_bucket
               when 'week'  then 'week'
               when 'month' then 'month'
               when 'year'  then 'year'
               else 'day'
             end;

  if v_from > v_to then v_from := v_to; end if;

  -- Prior window: the same span, immediately before.
  v_days  := (v_to - v_from) + 1;
  v_pto   := v_from - 1;
  v_pfrom := v_pto - (v_days - 1);

  with
  paid as (
    select b.id, b.paid_at, b.total_price, b.commission, b.tax_amount,
           b.host_payout, b.property_id, b.nights
      from public.bookings b
     where b.payment_status = 'paid'
       and b.paid_at is not null
  ),
  in_range as (
    select * from paid
     where paid_at >= v_from::timestamptz and paid_at < (v_to + 1)::timestamptz
  ),
  in_prior as (
    select * from paid
     where paid_at >= v_pfrom::timestamptz and paid_at < (v_pto + 1)::timestamptz
  ),
  refunds as (
    select coalesce(sum(coalesce(b.refunded_amount, b.total_price)), 0)::numeric as amount,
           count(*)::int as count
      from public.bookings b
     where b.payment_status = 'refunded'
       and coalesce(b.refunded_at, b.updated_at) >= v_from::timestamptz
       and coalesce(b.refunded_at, b.updated_at) <  (v_to + 1)::timestamptz
  ),
  refunds_prior as (
    select coalesce(sum(coalesce(b.refunded_amount, b.total_price)), 0)::numeric as amount,
           count(*)::int as count
      from public.bookings b
     where b.payment_status = 'refunded'
       and coalesce(b.refunded_at, b.updated_at) >= v_pfrom::timestamptz
       and coalesce(b.refunded_at, b.updated_at) <  (v_pto + 1)::timestamptz
  ),
  periods as (
    select
      coalesce(sum(total_price) filter (where paid_at >= date_trunc('day',   now())), 0)::numeric as day,
      coalesce(sum(total_price) filter (where paid_at >= date_trunc('week',  now())), 0)::numeric as week,
      coalesce(sum(total_price) filter (where paid_at >= date_trunc('month', now())), 0)::numeric as month,
      coalesce(sum(total_price) filter (where paid_at >= date_trunc('year',  now())), 0)::numeric as year,
      -- The equivalent slice of the previous period. Bounded at both ends so
      -- "yesterday" is yesterday alone, not everything before today.
      coalesce(sum(total_price) filter (
        where paid_at >= date_trunc('day', now()) - interval '1 day'
          and paid_at <  date_trunc('day', now())), 0)::numeric as prior_day,
      coalesce(sum(total_price) filter (
        where paid_at >= date_trunc('week', now()) - interval '1 week'
          and paid_at <  date_trunc('week', now())), 0)::numeric as prior_week,
      coalesce(sum(total_price) filter (
        where paid_at >= date_trunc('month', now()) - interval '1 month'
          and paid_at <  date_trunc('month', now())), 0)::numeric as prior_month,
      coalesce(sum(total_price) filter (
        where paid_at >= date_trunc('year', now()) - interval '1 year'
          and paid_at <  date_trunc('year', now())), 0)::numeric as prior_year
      from paid
  ),
  totals as (
    select
      coalesce(sum(total_price), 0)::numeric           as gross,
      coalesce(sum(commission), 0)::numeric            as commission,
      coalesce(sum(tax_amount), 0)::numeric            as taxes,
      coalesce(sum(host_payout), 0)::numeric           as payouts,
      count(*)::int                                    as bookings,
      count(commission)::int                           as commission_known,
      coalesce(round(avg(total_price), 2), 0)::numeric as avg_booking_value,
      coalesce(round(avg(nights), 1), 0)::numeric      as avg_nights,
      coalesce(round(
        percentile_cont(0.5) within group (order by total_price)::numeric, 2), 0)
                                                       as median_booking_value
      from in_range
  ),
  totals_prior as (
    select
      coalesce(sum(total_price), 0)::numeric           as gross,
      coalesce(sum(commission), 0)::numeric            as commission,
      coalesce(sum(tax_amount), 0)::numeric            as taxes,
      coalesce(sum(host_payout), 0)::numeric           as payouts,
      count(*)::int                                    as bookings,
      coalesce(round(avg(total_price), 2), 0)::numeric as avg_booking_value
      from in_prior
  ),
  buckets as (
    select generate_series(
             date_trunc(v_trunc, v_from::timestamptz),
             date_trunc(v_trunc, v_to::timestamptz),
             ('1 ' || v_trunc)::interval) as bucket
  ),
  trend as (
    select b.bucket,
           coalesce(sum(r.total_price), 0)::numeric as revenue,
           coalesce(sum(r.commission), 0)::numeric  as commission,
           count(r.id)::int                         as bookings
      from buckets b
      left join in_range r on date_trunc(v_trunc, r.paid_at) = b.bucket
     group by b.bucket
  ),
  -- The prior window bucketed identically, then shifted forward so point N of
  -- the dashed line sits under point N of the solid one.
  buckets_prior as (
    select generate_series(
             date_trunc(v_trunc, v_pfrom::timestamptz),
             date_trunc(v_trunc, v_pto::timestamptz),
             ('1 ' || v_trunc)::interval) as bucket
  ),
  trend_prior as (
    select b.bucket,
           coalesce(sum(r.total_price), 0)::numeric as revenue
      from buckets_prior b
      left join in_prior r on date_trunc(v_trunc, r.paid_at) = b.bucket
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
  by_city_prior as (
    select coalesce(nullif(btrim(p.city), ''), 'Unknown') as city,
           sum(r.total_price)::numeric                    as revenue
      from in_prior r
      join public.properties p on p.id = r.property_id
     group by 1
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
  distribution as (
    select band, lo, hi, count(r.id)::int as bookings,
           coalesce(sum(r.total_price), 0)::numeric as revenue
      from (values
              ('Under 10k',   0::numeric,      10000::numeric),
              ('10k-25k',     10000::numeric,  25000::numeric),
              ('25k-50k',     25000::numeric,  50000::numeric),
              ('50k-1L',      50000::numeric,  100000::numeric),
              ('1L-2.5L',     100000::numeric, 250000::numeric),
              ('2.5L+',       250000::numeric, null::numeric)
           ) as bands(band, lo, hi)
      left join in_range r
             on r.total_price >= bands.lo
            and (bands.hi is null or r.total_price < bands.hi)
     group by band, lo, hi
     order by lo
  )
  select json_build_object(
    'range', json_build_object('from', v_from, 'to', v_to, 'bucket', v_trunc,
                               'prior_from', v_pfrom, 'prior_to', v_pto,
                               'days', v_days),
    'periods', (select json_build_object(
                         'day', day, 'week', week, 'month', month, 'year', year)
                  from periods),
    'periods_prior', (select json_build_object(
                               'day', prior_day, 'week', prior_week,
                               'month', prior_month, 'year', prior_year)
                        from periods),
    'totals', (select json_build_object(
                        'gross',                t.gross,
                        'commission',           t.commission,
                        'taxes',                t.taxes,
                        'payouts',              t.payouts,
                        'net',                  t.gross - r.amount,
                        'refunds',              r.amount,
                        'refund_count',         r.count,
                        'bookings',             t.bookings,
                        'commission_known',     t.commission_known,
                        'avg_booking_value',    t.avg_booking_value,
                        'median_booking_value', t.median_booking_value,
                        'avg_nights',           t.avg_nights)
                 from totals t cross join refunds r),
    'prior', (select json_build_object(
                       'gross',             tp.gross,
                       'commission',        tp.commission,
                       'taxes',             tp.taxes,
                       'payouts',           tp.payouts,
                       'net',               tp.gross - rp.amount,
                       'refunds',           rp.amount,
                       'refund_count',      rp.count,
                       'bookings',          tp.bookings,
                       'avg_booking_value', tp.avg_booking_value)
                from totals_prior tp cross join refunds_prior rp),
    'trend', coalesce((select json_agg(json_build_object(
                                'bucket', to_char(bucket, 'YYYY-MM-DD'),
                                'revenue', revenue, 'commission', commission,
                                'bookings', bookings) order by bucket)
                         from trend), '[]'::json),
    'trend_prior', coalesce((select json_agg(revenue order by bucket)
                               from trend_prior), '[]'::json),
    'by_city', coalesce((select json_agg(json_build_object(
                                  'city', c.city, 'country', c.country,
                                  'revenue', c.revenue, 'bookings', c.bookings,
                                  'prior_revenue', coalesce(cp.revenue, 0))
                                order by c.revenue desc)
                           from by_city c
                           left join by_city_prior cp on cp.city = c.city), '[]'::json),
    'by_property_type', coalesce((select json_agg(json_build_object(
                                           'property_type', property_type,
                                           'revenue', revenue, 'bookings', bookings)
                                         order by revenue desc)
                                    from by_type), '[]'::json),
    'value_distribution', coalesce((select json_agg(json_build_object(
                                             'band', band, 'bookings', bookings,
                                             'revenue', revenue) order by lo)
                                      from distribution), '[]'::json)
  ) into v_result;

  return v_result;
end;
$fn$;

revoke all on function public.admin_revenue_dashboard(date, date, text) from public, anon;
grant execute on function public.admin_revenue_dashboard(date, date, text) to authenticated;
