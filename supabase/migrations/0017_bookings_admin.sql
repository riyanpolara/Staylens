-- ===========================================================================
-- 0015_bookings_admin.sql
-- Everything the /admin/bookings screen needs from the database.
--
-- `bookings` was created by 0004_engagement.sql as a forward-compatibility
-- stub ("schema-ready, not yet wired to UI"). Wiring the admin screen to it
-- exposes four gaps, all filled here:
--
--   1. No human-readable reference. Support staff quote "SL-48210", not a uuid.
--   2. No payment state. `status` tracks the reservation; whether the money
--      moved is a separate axis (a confirmed booking can be unpaid, a
--      cancelled one refunded).
--   3. No cancellation record. Who cancelled, when, and why is the first thing
--      asked in a dispute, and it cannot be reconstructed from `status` alone.
--   4. No server-side list query. The screen needs search + filter + sort +
--      pagination over a join of bookings → profiles → properties → hosts.
--      Doing that client-side would download the whole table to count it.
--
-- The read/write entry points are SECURITY DEFINER functions with an explicit
-- is_admin() guard, matching 0014_admin_dashboard.sql. Requires
-- 0013_admin_rls.sql (defines is_admin()).
--
-- Safe to run more than once.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Payment state — an axis of its own, independent of booking status.
-- ---------------------------------------------------------------------------
do $$ begin
  create type payment_status_enum as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Columns
-- ---------------------------------------------------------------------------

-- Reference numbers start at 48000 so they look like an established ledger
-- rather than "SL-00001" on the first real booking.
create sequence if not exists public.booking_reference_seq start with 48000;

alter table public.bookings
  add column if not exists reference           text,
  add column if not exists payment_status      payment_status_enum not null default 'pending',
  add column if not exists commission          numeric(10,2),
  add column if not exists cancelled_at        timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_by        uuid references public.profiles (id) on delete set null;

-- `nights` is derived, never entered — a stored generated column keeps it
-- consistent with the dates and makes it sortable/indexable.
do $$ begin
  alter table public.bookings
    add column nights integer generated always as (check_out - check_in) stored;
exception when duplicate_column then null; end $$;

alter table public.bookings
  alter column reference
  set default 'SL-' || lpad(nextval('public.booking_reference_seq')::text, 5, '0');

update public.bookings
   set reference = 'SL-' || lpad(nextval('public.booking_reference_seq')::text, 5, '0')
 where reference is null;

alter table public.bookings alter column reference set not null;

comment on column public.bookings.reference is
  'Human-quotable booking number (SL-48210). Unique, assigned on insert.';
comment on column public.bookings.payment_status is
  'Money state, independent of reservation status.';
comment on column public.bookings.commission is
  'Platform take for this booking. Null until the payments flow writes it.';
comment on column public.bookings.nights is
  'Generated: check_out - check_in.';

-- Inserts from the app (authenticated role) must be able to draw a reference.
grant usage, select on sequence public.booking_reference_seq to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Indexes for the list screen's filters and sorts.
--    The table is empty today, so these build instantly.
-- ---------------------------------------------------------------------------
create unique index if not exists idx_bookings_reference      on public.bookings (reference);
create        index if not exists idx_bookings_payment_status on public.bookings (payment_status);
create        index if not exists idx_bookings_check_in       on public.bookings (check_in);
create        index if not exists idx_bookings_guest          on public.bookings (guest_id);
create        index if not exists idx_bookings_property       on public.bookings (property_id);

-- ---------------------------------------------------------------------------
-- 4. RLS. 0013 gave admins SELECT; the screen also writes (status changes,
--    cancellation, payment state). The RPCs below are SECURITY DEFINER so they
--    do not depend on this policy — it exists so a direct PostgREST update
--    from an admin session behaves consistently rather than silently
--    affecting zero rows.
-- ---------------------------------------------------------------------------
drop policy if exists "bookings: admin update" on public.bookings;
create policy "bookings: admin update" on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Shared row shape.
--    Both the list and the detail RPC project the same booking fields, so the
--    UI can render a row and a detail header from one type.
-- ---------------------------------------------------------------------------
create or replace view public.admin_bookings_view as
select
  b.id,
  b.reference,
  b.check_in,
  b.check_out,
  b.nights,
  b.guests,
  b.nightly_price,
  b.cleaning_fee,
  b.total_price,
  b.commission,
  b.currency,
  b.status,
  b.payment_status,
  b.cancelled_at,
  b.cancellation_reason,
  b.cancelled_by,
  b.created_at,
  b.updated_at,
  b.guest_id,
  g.full_name  as guest_name,
  g.email      as guest_email,
  g.username   as guest_username,
  g.avatar_url as guest_avatar_url,
  b.property_id,
  p.name       as property_name,
  p.city       as property_city,
  p.country    as property_country,
  p.property_type,
  p.room_type,
  p.host_id,
  h.name       as host_name,
  h.is_superhost as host_is_superhost
from public.bookings b
join public.profiles   g on g.id = b.guest_id
join public.properties p on p.id = b.property_id
left join public.hosts h on h.id = p.host_id;

comment on view public.admin_bookings_view is
  'Denormalised booking rows for the admin screen. Read only through the admin_* RPCs.';

-- The view is only ever read from inside SECURITY DEFINER functions, which run
-- as the owner. Nothing else should reach it.
revoke all on public.admin_bookings_view from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. List: search + filter + sort + page, in one round trip.
--
--    Sorting is expressed as CASE-derived keys rather than dynamic SQL, so no
--    caller-supplied string is ever concatenated into the statement. An
--    unrecognised p_sort falls through to created_at instead of erroring.
-- ---------------------------------------------------------------------------
create or replace function public.admin_bookings_list(
  p_search    text default null,
  p_status    text default null,   -- booking_status_enum value, or 'all'/null
  p_payment   text default null,   -- payment_status_enum value, or 'all'/null
  p_from      date default null,   -- stay overlaps [p_from, p_to]
  p_to        date default null,
  p_sort      text default 'created_at',
  p_dir       text default 'desc',
  p_page      int  default 1,
  p_page_size int  default 10
)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_page    int  := greatest(coalesce(p_page, 1), 1);
  v_size    int  := least(greatest(coalesce(p_page_size, 10), 1), 100);
  v_offset  int;
  v_q       text := nullif(btrim(coalesce(p_search, '')), '');
  v_status  text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_payment text := nullif(lower(btrim(coalesce(p_payment, ''))), '');
  v_sort    text := lower(btrim(coalesce(p_sort, 'created_at')));
  v_asc     boolean := lower(btrim(coalesce(p_dir, 'desc'))) = 'asc';
  v_total   int;
  v_rows    json;
  v_metrics json;
begin
  if not public.is_admin() then
    raise exception 'admin_bookings_list: forbidden' using errcode = '42501';
  end if;

  if v_status  = 'all' then v_status  := null; end if;
  if v_payment = 'all' then v_payment := null; end if;
  v_offset := (v_page - 1) * v_size;

  with filtered as (
    select v.*
      from public.admin_bookings_view v
     where (v_status  is null or v.status::text         = v_status)
       and (v_payment is null or v.payment_status::text = v_payment)
       -- date window matches stays that OVERLAP it, not just those starting in it
       and (p_from is null or v.check_out >= p_from)
       and (p_to   is null or v.check_in  <= p_to)
       and (
         v_q is null
         or v.reference                        ilike '%' || v_q || '%'
         or coalesce(v.guest_name, '')          ilike '%' || v_q || '%'
         or coalesce(v.guest_email, '')         ilike '%' || v_q || '%'
         or coalesce(v.property_name, '')       ilike '%' || v_q || '%'
         or coalesce(v.property_city, '')       ilike '%' || v_q || '%'
         or coalesce(v.host_name, '')           ilike '%' || v_q || '%'
       )
  ),
  keyed as (
    select f.*,
           case v_sort
             when 'reference' then f.reference
             when 'guest'     then lower(coalesce(f.guest_name, f.guest_email, ''))
             when 'property'  then lower(coalesce(f.property_name, ''))
             when 'status'    then f.status::text
             when 'payment'   then f.payment_status::text
             else null
           end as sort_txt,
           case v_sort
             when 'check_in'    then extract(epoch from f.check_in)
             when 'check_out'   then extract(epoch from f.check_out)
             when 'nights'      then f.nights::numeric
             when 'total_price' then coalesce(f.total_price, 0)
             else extract(epoch from f.created_at)
           end as sort_val
      from filtered f
  ),
  ordered as (
    select k.*,
           row_number() over (
             order by
               case when v_asc     then k.sort_txt end asc  nulls last,
               case when not v_asc then k.sort_txt end desc nulls last,
               case when v_asc     then k.sort_val end asc  nulls last,
               case when not v_asc then k.sort_val end desc nulls last,
               k.created_at desc,
               k.id
           ) as rn
      from keyed k
  )
  select
    (select count(*)::int from filtered),
    coalesce(
      (select json_agg(
                json_build_object(
                  'id',             o.id,
                  'reference',      o.reference,
                  'check_in',       o.check_in,
                  'check_out',      o.check_out,
                  'nights',         o.nights,
                  'guests',         o.guests,
                  'total_price',    o.total_price,
                  'currency',       o.currency,
                  'status',         o.status,
                  'payment_status', o.payment_status,
                  'created_at',     o.created_at,
                  'guest',          json_build_object(
                                      'id',         o.guest_id,
                                      'name',       o.guest_name,
                                      'email',      o.guest_email,
                                      'avatar_url', o.guest_avatar_url),
                  'property',       json_build_object(
                                      'id',      o.property_id,
                                      'title',   o.property_name,
                                      'city',    o.property_city,
                                      'country', o.property_country),
                  'host',           json_build_object(
                                      'id',   o.host_id,
                                      'name', o.host_name)
                ) order by o.rn)
         from ordered o
        where o.rn > v_offset and o.rn <= v_offset + v_size),
      '[]'::json)
  into v_total, v_rows;

  -- Header metrics describe the whole marketplace, not the current filter —
  -- they are a fixed frame of reference while the operator narrows the table.
  select json_build_object(
    'bookings_today', (
      select count(*) from public.bookings
       where created_at >= date_trunc('day', now())),
    'checkins_week', (
      select count(*) from public.bookings
       where check_in >= date_trunc('week', now())::date
         and check_in <  (date_trunc('week', now()) + interval '7 days')::date
         and status in ('confirmed', 'completed')),
    'cancellation_rate', (
      select case when count(*) = 0 then null
                  else round(100.0 * count(*) filter (where status = 'cancelled')
                             / count(*), 1)
             end
        from public.bookings),
    'avg_booking_value', (
      select round(avg(total_price), 0) from public.bookings
       where status <> 'cancelled' and total_price is not null),
    'total_bookings',   (select count(*) from public.bookings),
    'pending_payments', (
      select count(*) from public.bookings
       where payment_status = 'pending' and status <> 'cancelled')
  ) into v_metrics;

  return json_build_object(
    'rows',       v_rows,
    'total',      v_total,
    'page',       v_page,
    'page_size',  v_size,
    'page_count', greatest(ceil(v_total::numeric / v_size)::int, 1),
    'metrics',    v_metrics
  );
end;
$$;

comment on function public.admin_bookings_list(text, text, text, date, date, text, text, int, int) is
  'Paged, searchable, filterable booking list for the admin screen. Admin-only.';

-- ---------------------------------------------------------------------------
-- 7. Detail: one booking with the full guest / property / host context.
-- ---------------------------------------------------------------------------
create or replace function public.admin_booking_detail(p_id uuid)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_admin() then
    raise exception 'admin_booking_detail: forbidden' using errcode = '42501';
  end if;

  select json_build_object(
    'id',                  v.id,
    'reference',           v.reference,
    'check_in',            v.check_in,
    'check_out',           v.check_out,
    'nights',              v.nights,
    'guests',              v.guests,
    'nightly_price',       v.nightly_price,
    'cleaning_fee',        v.cleaning_fee,
    'total_price',         v.total_price,
    'commission',          v.commission,
    'currency',            v.currency,
    'status',              v.status,
    'payment_status',      v.payment_status,
    'cancelled_at',        v.cancelled_at,
    'cancellation_reason', v.cancellation_reason,
    'cancelled_by_name',   (select c.full_name from public.profiles c where c.id = v.cancelled_by),
    'created_at',          v.created_at,
    'updated_at',          v.updated_at,

    'guest', json_build_object(
      'id',            v.guest_id,
      'name',          v.guest_name,
      'email',         v.guest_email,
      'username',      v.guest_username,
      'avatar_url',    v.guest_avatar_url,
      'member_since',  (select g.created_at from public.profiles g where g.id = v.guest_id),
      'booking_count', (select count(*) from public.bookings b2 where b2.guest_id = v.guest_id),
      'total_spend',   (select coalesce(sum(b3.total_price), 0) from public.bookings b3
                         where b3.guest_id = v.guest_id and b3.status <> 'cancelled')
    ),

    'property', (
      select json_build_object(
        'id',                  p.id,
        'title',               p.name,
        'city',                p.city,
        'country',             p.country,
        'property_type',       p.property_type,
        'room_type',           p.room_type,
        'accommodates',        p.accommodates,
        'bedrooms',            p.bedrooms,
        'beds',                p.beds,
        'bathrooms',           p.bathrooms,
        'price',               p.price,
        'currency',            p.currency,
        'cleaning_fee',        p.cleaning_fee,
        'minimum_nights',      p.minimum_nights,
        'cancellation_policy', p.cancellation_policy,
        'listing_url',         p.listing_url,
        'is_active',           p.is_active,
        -- stored 0..100; the UI shows the 0..5 scale
        'rating',              round((p.review_scores_rating / 20.0)::numeric, 2),
        'review_count',        p.number_of_reviews,
        'image_url',           (select pi.url from public.property_images pi
                                 where pi.property_id = p.id
                                 order by pi.is_primary desc, pi.sort_order nulls last
                                 limit 1)
      )
      from public.properties p where p.id = v.property_id
    ),

    'host', (
      select json_build_object(
        'id',                h.id,
        'name',              h.name,
        'location',          h.location,
        'picture_url',       h.picture_url,
        'is_superhost',      h.is_superhost,
        'identity_verified', h.identity_verified,
        'response_rate',     h.response_rate,
        'response_time',     h.response_time,
        'listings_count',    h.listings_count
      )
      from public.hosts h where h.id = v.host_id
    )
  )
  into result
  from public.admin_bookings_view v
  where v.id = p_id;

  return result;  -- null when the id does not exist; the caller renders "not found"
end;
$$;

comment on function public.admin_booking_detail(uuid) is
  'Single booking with guest, property and host context. Admin-only.';

-- ---------------------------------------------------------------------------
-- 8. Mutations.
--    Each validates the target value against the enum before writing, so a
--    bad input is a clean error rather than a 22P02 from the cast.
-- ---------------------------------------------------------------------------

create or replace function public.admin_booking_set_status(p_id uuid, p_status text)
returns json
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_status booking_status_enum;
begin
  if not public.is_admin() then
    raise exception 'admin_booking_set_status: forbidden' using errcode = '42501';
  end if;

  if lower(btrim(coalesce(p_status, ''))) = 'cancelled' then
    raise exception 'Use admin_booking_cancel to cancel a booking (a reason is required).'
      using errcode = '22023';
  end if;

  begin
    v_status := lower(btrim(p_status))::booking_status_enum;
  exception when invalid_text_representation then
    raise exception 'Unknown booking status: %', p_status using errcode = '22023';
  end;

  update public.bookings b
     set status = v_status,
         -- reinstating a cancelled booking clears the cancellation record so it
         -- cannot be mistaken for the current state
         cancelled_at        = null,
         cancellation_reason = null,
         cancelled_by        = null
   where b.id = p_id;

  if not found then
    raise exception 'Booking % not found', p_id using errcode = 'P0002';
  end if;

  return public.admin_booking_detail(p_id);
end;
$$;

comment on function public.admin_booking_set_status(uuid, text) is
  'Move a booking to pending/confirmed/completed/declined. Admin-only.';

create or replace function public.admin_booking_set_payment(p_id uuid, p_payment text)
returns json
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_payment payment_status_enum;
begin
  if not public.is_admin() then
    raise exception 'admin_booking_set_payment: forbidden' using errcode = '42501';
  end if;

  begin
    v_payment := lower(btrim(p_payment))::payment_status_enum;
  exception when invalid_text_representation then
    raise exception 'Unknown payment status: %', p_payment using errcode = '22023';
  end;

  update public.bookings b set payment_status = v_payment where b.id = p_id;

  if not found then
    raise exception 'Booking % not found', p_id using errcode = 'P0002';
  end if;

  return public.admin_booking_detail(p_id);
end;
$$;

comment on function public.admin_booking_set_payment(uuid, text) is
  'Set a booking''s payment state (pending/paid/failed/refunded). Admin-only.';

create or replace function public.admin_booking_cancel(
  p_id     uuid,
  p_reason text,
  p_refund boolean default true
)
returns json
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_reason  text := nullif(btrim(coalesce(p_reason, '')), '');
  v_current booking_status_enum;
begin
  if not public.is_admin() then
    raise exception 'admin_booking_cancel: forbidden' using errcode = '42501';
  end if;

  if v_reason is null then
    raise exception 'A cancellation reason is required.' using errcode = '22023';
  end if;

  select status into v_current from public.bookings where id = p_id;
  if not found then
    raise exception 'Booking % not found', p_id using errcode = 'P0002';
  end if;
  if v_current = 'cancelled' then
    raise exception 'This booking is already cancelled.' using errcode = '22023';
  end if;

  update public.bookings b
     set status              = 'cancelled',
         cancelled_at        = now(),
         cancellation_reason = v_reason,
         cancelled_by        = auth.uid(),
         -- only money that actually moved can be refunded; an unpaid booking
         -- stays 'pending' so it is not counted as a refund in reporting
         payment_status      = case
                                 when p_refund and b.payment_status = 'paid'
                                   then 'refunded'::payment_status_enum
                                 else b.payment_status
                               end
   where b.id = p_id;

  return public.admin_booking_detail(p_id);
end;
$$;

comment on function public.admin_booking_cancel(uuid, text, boolean) is
  'Cancel a booking with an auditable reason, optionally refunding. Admin-only.';

-- ---------------------------------------------------------------------------
-- 9. Grants — authenticated only; the is_admin() guard inside does the rest.
-- ---------------------------------------------------------------------------
do $$
declare sig text;
begin
  foreach sig in array array[
    'public.admin_bookings_list(text, text, text, date, date, text, text, int, int)',
    'public.admin_booking_detail(uuid)',
    'public.admin_booking_set_status(uuid, text)',
    'public.admin_booking_set_payment(uuid, text)',
    'public.admin_booking_cancel(uuid, text, boolean)'
  ] loop
    execute format('revoke all on function %s from public, anon', sig);
    execute format('grant execute on function %s to authenticated, service_role', sig);
  end loop;
end $$;
