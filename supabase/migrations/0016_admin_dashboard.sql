-- ===========================================================================
-- 0016_admin_dashboard.sql
-- Server-side aggregation for the /admin dashboard home.
--
-- Everything the screen needs comes back in ONE round trip as json. Doing the
-- aggregation in SQL (rather than fetching rows and reducing in JS) matters
-- here: `properties` has ~6.5k rows and `reviews` ~43k, and the client would
-- otherwise have to download them just to count.
--
-- SECURITY DEFINER so the function can read across RLS, with an explicit
-- is_admin() guard inside — a non-admin calling it gets an exception, never
-- data. Requires 0013_admin_rls.sql (which defines is_admin()).
--
-- Safe to run more than once.
-- ===========================================================================

create or replace function public.admin_dashboard_home(months int default 12)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result json;
  span   interval := (greatest(months, 1) || ' months')::interval;
begin
  -- Authorization is enforced here, not by RLS, because SECURITY DEFINER
  -- bypasses RLS by design.
  if not public.is_admin() then
    raise exception 'admin_dashboard_home: forbidden'
      using errcode = '42501';
  end if;

  select json_build_object(
    'kpis', (
      select json_build_object(
        'total_users',      (select count(*) from public.profiles),
        -- 0015_property_moderation made `status` canonical and derives
        -- `is_active` from it via trigger, so count on the source of truth.
        'total_properties', (select count(*) from public.properties
                              where status = 'live'),
        'pending_properties', (select count(*) from public.properties
                                where status = 'pending'),
        'total_bookings',   (select count(*) from public.bookings),
        'total_revenue',    (select coalesce(sum(total_price), 0)
                               from public.bookings
                              where status <> 'cancelled'),
        -- review_scores_rating is stored 0..100; surface the 0..5 scale the UI uses
        'avg_rating',       (select round((avg(review_scores_rating) / 20.0)::numeric, 2)
                               from public.properties
                              where review_scores_rating is not null),
        'total_reviews',    (select count(*) from public.reviews),
        'active_hosts',     (select count(*) from public.hosts
                              where coalesce(listings_count, 0) > 0),
        -- Not derivable from the current schema; the UI renders these as
        -- "unavailable" rather than inventing a number.
        --   pending_reviews : reviews has no moderation status column
        --   ai_searches     : no ai_search_events table exists yet
        'pending_reviews',  null,
        'ai_searches',      null
      )
    ),

    'revenue_series', (
      select coalesce(json_agg(r order by r.bucket), '[]'::json)
      from (
        select date_trunc('month', b.created_at) as bucket,
               to_char(date_trunc('month', b.created_at), 'Mon') as label,
               sum(b.total_price)::numeric as value
          from public.bookings b
         where b.status <> 'cancelled'
           and b.created_at > now() - span
         group by 1, 2
      ) r
    ),

    'bookings_series', (
      select coalesce(json_agg(s order by s.bucket), '[]'::json)
      from (
        select date_trunc('month', b.created_at) as bucket,
               to_char(date_trunc('month', b.created_at), 'Mon') as label,
               count(*) filter (where b.status in ('confirmed', 'completed')) as confirmed,
               count(*) filter (where b.status = 'cancelled') as cancelled
          from public.bookings b
         where b.created_at > now() - span
         group by 1, 2
      ) s
    ),

    'property_mix', (
      select coalesce(json_agg(m order by m.value desc), '[]'::json)
      from (
        select coalesce(room_type::text, 'Unknown') as label,
               count(*)::int as value
          from public.properties
         where status = 'live'
         group by 1
      ) m
    ),

    'recent_activity', (
      select coalesce(json_agg(a order by a.at desc), '[]'::json)
      from (
        -- The outer LIMIT has to live in this subquery: the enclosing SELECT
        -- aggregates to a single row, so a LIMIT there would be a no-op and
        -- all 10 candidate rows would end up in the array.
        select *
          from (
            (select 'New booking'::text as title,
                    coalesce(p.name, 'Property') || ' - ' ||
                      coalesce('$' || round(b.total_price)::text, 'no total') as meta,
                    'booking'::text as kind,
                    b.created_at as at
               from public.bookings b
               left join public.properties p on p.id = b.property_id
              order by b.created_at desc
              limit 5)
            union all
            (select 'Property listed'::text,
                    coalesce(p.name, 'Untitled') || ' - ' || coalesce(p.city, 'unknown'),
                    'property'::text,
                    p.created_at
               from public.properties p
              where p.status = 'live'
              order by p.created_at desc
              limit 5)
          ) u
         order by u.at desc
         limit 8
      ) a
    )
  ) into result;

  return result;
end;
$$;

comment on function public.admin_dashboard_home(int) is
  'One-shot aggregate for the admin dashboard home. Admin-only.';

revoke all on function public.admin_dashboard_home(int) from public, anon;
grant execute on function public.admin_dashboard_home(int) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Supporting indexes for the time-bucketed aggregates. `bookings` is empty
-- today, so these build instantly; they keep the dashboard flat as it fills.
-- ---------------------------------------------------------------------------
create index if not exists idx_bookings_created_at on public.bookings (created_at);
create index if not exists idx_bookings_status     on public.bookings (status);
create index if not exists idx_properties_created  on public.properties (created_at)
  where status = 'live';
