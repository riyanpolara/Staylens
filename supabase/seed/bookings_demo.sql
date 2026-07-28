-- ===========================================================================
-- bookings_demo.sql — OPTIONAL demo data for /admin/bookings
--
-- NOT a migration. Nothing in the app requires this; it exists only so the
-- Bookings screen can be exercised (search, filters, paging, status changes,
-- cancellation) before real reservations exist. `bookings` is empty on a fresh
-- database, and an empty table renders the "No bookings yet" state — correct,
-- but not much to look at.
--
-- HOW TO RUN
--   Paste into the Supabase SQL editor and execute. It runs as superuser
--   there, so RLS does not apply.
--
-- WHAT IT DOES
--   Creates 48 bookings spread over the last ~4 months and the next ~2, using
--   real properties and their real hosts, with a realistic spread of booking
--   and payment states. Every row is guest-owned by the profile you pick below.
--
-- HOW TO REMOVE  (see the bottom of this file for the exact statement)
--   Every seeded row is tagged with a cancellation_reason marker or the
--   `commission` back-reference, so removal is a single delete — no guessing.
--
-- Safe to run more than once: it deletes its own previous output first.
-- ===========================================================================

do $$
declare
  v_guest    uuid;
  v_inserted int;
begin
  -- ── Which profile owns the demo bookings ────────────────────────────────
  -- Defaults to the first admin; change the email here to use someone else.
  select id into v_guest from public.profiles where role = 'admin' order by created_at limit 1;
  if v_guest is null then
    select id into v_guest from public.profiles order by created_at limit 1;
  end if;
  if v_guest is null then
    raise exception 'No profiles exist yet — sign up through the app first.';
  end if;

  -- ── Clear any previous run of this script ───────────────────────────────
  delete from public.bookings where reference like 'SL-D%';

  -- ── Insert ──────────────────────────────────────────────────────────────
  -- One booking per property keeps the `no_overlapping_bookings` exclusion
  -- constraint out of the way (it only rejects overlapping *confirmed* stays
  -- on the SAME property).
  --
  -- References are given a 'SL-D…' prefix so demo rows are visually obvious
  -- in the UI and trivially deletable. Real bookings use the sequence default.
  insert into public.bookings
    (reference, property_id, guest_id, check_in, check_out, guests,
     nightly_price, cleaning_fee, total_price, commission, currency,
     status, payment_status, created_at,
     cancelled_at, cancellation_reason, cancelled_by)
  select
    'SL-D' || lpad(p.rn::text, 4, '0'),
    p.id,
    v_guest,
    p.check_in,
    p.check_in + p.nights,
    (1 + (p.rn % 4))::smallint,
    p.nightly,
    p.clean,
    round(p.nightly * p.nights + p.clean, 2),
    round((p.nightly * p.nights + p.clean) * 0.12, 2),
    coalesce(p.currency, 'USD'),
    p.status,
    p.payment,
    now() - ((p.rn * 3) || ' days')::interval,
    case when p.status = 'cancelled' then now() - ((p.rn) || ' days')::interval end,
    case when p.status = 'cancelled'
         then (array[
                'Guest requested — travel plans changed',
                'Host unavailable — emergency maintenance',
                'Payment authorisation failed twice'
              ])[1 + (p.rn % 3)]
    end,
    case when p.status = 'cancelled' then v_guest end
  from (
    select
      x.id,
      x.rn,
      coalesce(x.currency, 'USD') as currency,
      -- keep prices sane: the dataset has a few extreme outliers
      least(greatest(coalesce(x.price, 120), 45), 900)          as nightly,
      round(least(greatest(coalesce(x.price, 120), 45), 900) * 0.18, 2) as clean,
      (2 + (x.rn % 6))                                          as nights,
      -- stays fan out from ~110 days ago to ~60 days ahead
      (current_date - 110 + (x.rn * 4))                         as check_in,
      (array['completed','completed','confirmed','confirmed','confirmed',
             'pending','pending','cancelled','declined'])[1 + (x.rn % 9)]::booking_status_enum as status,
      (array['paid','paid','paid','paid','pending',
             'pending','failed','refunded','pending'])[1 + (x.rn % 9)]::payment_status_enum    as payment
    from (
      select id, price, currency, (row_number() over (order by md5(id::text)))::int as rn
      from public.properties
      where is_active and name is not null and host_id is not null
      limit 48
    ) x
  ) p;

  get diagnostics v_inserted = row_count;
  raise notice 'bookings_demo: inserted % rows for guest %', v_inserted, v_guest;
end $$;

-- Keep the two axes coherent: a stay that already ended and was paid reads as
-- completed, and nothing cancelled should still look like it is arriving.
update public.bookings
   set status = 'completed'
 where reference like 'SL-D%'
   and check_out < current_date
   and status = 'confirmed'
   and payment_status = 'paid';

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
select status, payment_status, count(*)
  from public.bookings
 where reference like 'SL-D%'
 group by 1, 2
 order by 1, 2;

-- ---------------------------------------------------------------------------
-- REMOVE THE DEMO DATA
--
--   delete from public.bookings where reference like 'SL-D%';
--
-- Real bookings are never affected: their references come from
-- booking_reference_seq and always look like 'SL-48210'.
-- ---------------------------------------------------------------------------
