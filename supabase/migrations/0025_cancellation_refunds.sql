-- ===========================================================================
-- 0025_cancellation_refunds.sql
-- Phase 1 guest-facing cancellation and refunds.
--
-- ⚠ SECURITY FIX INCLUDED — READ THIS FIRST
--
-- `bookings` carried two policies that let a guest write any column on their
-- own rows:
--
--     "bookings: insert own"  with check (auth.uid() = guest_id)
--     "bookings: update own"  using/check (auth.uid() = guest_id)
--
-- Verified exploitable against this database before writing this migration:
--
--   * a guest rewrote their own total_price from 52,800 to 1
--   * a guest inserted a booking with payment_status='paid' and no payment
--   * a guest set payment_status='refunded' and refunded_amount themselves
--
-- Building a refund system on top of that would be pointless: anyone could
-- award themselves a refund by updating a row. Both policies are dropped here.
-- Guests keep SELECT on their own bookings; every write now goes through a
-- SECURITY DEFINER function that checks ownership and eligibility, or through
-- the service role (which is already how the Razorpay flow inserts bookings —
-- the comment in payment-actions.ts claiming there was no INSERT policy was
-- simply wrong).
--
-- REFUND POLICY
--
-- `properties.cancellation_policy` already holds real Airbnb policy keys:
-- flexible (860), moderate (995), strict_14_with_grace_period (1,824),
-- super_strict_30 (27), super_strict_60 (76), and NULL (2,698). The refund is
-- computed from that column, not from a constant, so two properties with
-- different policies refund differently.
--
-- NULL falls back to strict_14_with_grace_period because that is what the
-- checkout screen actually promises the guest ("full refund if you cancel at
-- least 14 days before arrival"). Defaulting to anything stricter would refund
-- less than what they were told at the point of sale.
--
-- The percentage and the policy key are BOTH snapshotted onto the booking, so
-- changing a property's policy later cannot rewrite what an old cancellation
-- was owed.
--
-- Safe to run more than once.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Close the write hole.
-- ---------------------------------------------------------------------------
drop policy if exists "bookings: insert own" on public.bookings;
drop policy if exists "bookings: update own" on public.bookings;

-- Reads are unchanged: "bookings: select own" and "bookings: guest reads own"
-- both remain, so a guest still sees their own trips.

-- ---------------------------------------------------------------------------
-- 2. Refund state.
--
--    The spec's lifecycle is pending → processing → completed. `failed` is
--    added because a real payment provider can decline a refund, and a status
--    column that cannot express failure forces a lie when it happens.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'refund_status_enum') then
    create type refund_status_enum as enum ('pending', 'processing', 'completed', 'failed');
  end if;
end $$;

alter table public.bookings
  add column if not exists refund_status  refund_status_enum,
  add column if not exists refund_policy  text,
  add column if not exists refund_percent numeric(5,2);

comment on column public.bookings.refund_status is
  'NULL when no refund is owed. pending → processing → completed (or failed).';
comment on column public.bookings.refund_policy is
  'The policy key in force at cancellation. Snapshotted so a later change to '
  'the property cannot rewrite what this booking was owed.';
comment on column public.bookings.refunded_amount is
  'Amount to return to the guest, in the booking currency.';

create index if not exists idx_bookings_refund_status
  on public.bookings (refund_status)
  where refund_status is not null;

-- ---------------------------------------------------------------------------
-- 3. The policy engine.
--
--    Pure and deterministic: same booking + same instant → same answer. Used by
--    the confirmation modal to quote a refund and by the cancel function to
--    apply one, so the number the guest agrees to is the number they get.
-- ---------------------------------------------------------------------------
create or replace function public.refund_percent_for(
  p_policy    text,
  p_booked_at timestamptz,
  p_check_in  date,
  p_now       timestamptz default now()
)
returns numeric
language plpgsql
immutable
as $$
declare
  -- Calendar days between today and check-in.
  --
  -- Date subtraction, NOT (timestamp - now)/86400: the latter measures from the
  -- current time to midnight on the check-in date, so cancelling at 2pm exactly
  -- seven days out floored to 6 and paid 0% instead of 50%. Thresholds in a
  -- refund policy are calendar days, and this is how a guest counts them.
  v_days   int  := p_check_in - (p_now at time zone 'UTC')::date;
  v_grace  bool := (p_now - p_booked_at) < interval '48 hours';
  v_policy text := lower(btrim(coalesce(nullif(p_policy, ''), 'strict_14_with_grace_period')));
begin
  -- Already started or past: nothing is refundable under any policy.
  if v_days < 0 then
    return 0;
  end if;

  case v_policy
    when 'flexible' then
      -- Full refund until 24 hours before check-in.
      return case when v_days >= 1 then 100 else 0 end;

    when 'moderate' then
      -- Full refund until 5 days before check-in.
      return case when v_days >= 5 then 100 else 0 end;

    when 'super_strict_30' then
      return case when v_days >= 30 then 50 else 0 end;

    when 'super_strict_60' then
      return case when v_days >= 60 then 50 else 0 end;

    else
      -- strict_14_with_grace_period, and the NULL default.
      -- Full refund inside the 48-hour grace window if check-in is still 14+
      -- days out; half if 7+ days out; nothing after that.
      if v_grace and v_days >= 14 then return 100; end if;
      if v_days >= 7 then return 50; end if;
      return 0;
  end case;
end;
$$;

comment on function public.refund_percent_for(text, timestamptz, date, timestamptz) is
  'Refund percentage for a cancellation policy at a point in time. Pure.';

-- ---------------------------------------------------------------------------
-- 4. Quote — what the confirmation modal shows.
--
--    Read-only. Returns eligibility and the exact figure, so the modal never
--    has to compute money in JavaScript.
-- ---------------------------------------------------------------------------
create or replace function public.booking_cancellation_quote(p_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  b        record;
  v_uid    uuid := auth.uid();
  v_pct    numeric;
  v_amount numeric;
  v_reason text;
begin
  if v_uid is null then
    raise exception 'booking_cancellation_quote: not signed in' using errcode = '42501';
  end if;

  select bk.id, bk.guest_id, bk.status, bk.payment_status, bk.total_price,
         bk.currency, bk.check_in, bk.check_out, bk.created_at, bk.reference,
         p.name as property_name, p.cancellation_policy
    into b
    from public.bookings bk
    left join public.properties p on p.id = bk.property_id
   where bk.id = p_id;

  if not found then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Ownership is checked here, not by RLS: this function is SECURITY DEFINER
  -- and would otherwise happily quote a stranger's booking.
  if b.guest_id <> v_uid then
    return json_build_object('ok', false, 'reason', 'not_yours');
  end if;

  if b.status = 'cancelled' then
    v_reason := 'already_cancelled';
  elsif b.status = 'completed' then
    v_reason := 'already_completed';
  elsif b.check_in <= current_date then
    -- The stay has started; cancelling is no longer the guest's to do.
    v_reason := 'checked_in';
  end if;

  v_pct := public.refund_percent_for(
             b.cancellation_policy, b.created_at, b.check_in);
  -- Only money that actually moved can come back.
  v_amount := case when b.payment_status = 'paid'
                   then round(b.total_price * v_pct / 100, 2)
                   else 0 end;

  return json_build_object(
    'ok',             v_reason is null,
    'reason',         v_reason,
    'booking_id',     b.id,
    'reference',      b.reference,
    'property_name',  b.property_name,
    'check_in',       b.check_in,
    'check_out',      b.check_out,
    'total_price',    b.total_price,
    'currency',       b.currency,
    'paid',           (b.payment_status = 'paid'),
    'policy',         coalesce(nullif(b.cancellation_policy, ''), 'strict_14_with_grace_period'),
    'refund_percent', v_pct,
    'refund_amount',  v_amount,
    -- Same calendar-day arithmetic refund_percent_for uses. With the timestamp
    -- form this reported 4 days while the policy correctly applied its 5-day
    -- rule — the modal would have contradicted the refund beside it.
    'days_to_checkin', (b.check_in - current_date)
  );
end;
$$;

revoke all on function public.booking_cancellation_quote(uuid) from public, anon;
grant execute on function public.booking_cancellation_quote(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Cancel.
--
--    Never deletes. Sets status, the audit fields, and the refund figures in
--    one statement so a booking cannot end up cancelled-without-a-refund-record
--    if something fails halfway.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_my_booking(
  p_id     uuid,
  p_reason text default null
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_quote  json;
  v_pct    numeric;
  v_amount numeric;
  v_paid   boolean;
begin
  if v_uid is null then
    raise exception 'cancel_my_booking: not signed in' using errcode = '42501';
  end if;

  -- Re-quote inside the same transaction rather than trusting anything the
  -- client sends: the refund is recomputed from the policy at the moment of
  -- cancellation, so a stale modal cannot lock in a better rate.
  v_quote := public.booking_cancellation_quote(p_id);
  if not (v_quote->>'ok')::boolean then
    return v_quote;
  end if;

  v_pct    := (v_quote->>'refund_percent')::numeric;
  v_amount := (v_quote->>'refund_amount')::numeric;
  v_paid   := (v_quote->>'paid')::boolean;

  update public.bookings
     set status              = 'cancelled',
         cancelled_at        = now(),
         cancelled_by        = v_uid,
         cancellation_reason = nullif(btrim(coalesce(p_reason, '')), ''),
         refund_policy       = v_quote->>'policy',
         refund_percent      = v_pct,
         refunded_amount     = v_amount,
         -- 'processing' the moment it is owed. A refund that is owed but has no
         -- status is invisible to every report that looks for one.
         refund_status       = case when v_amount > 0 then 'processing'::refund_status_enum
                                    else null end,
         -- payment_status only becomes 'refunded' once the money is actually
         -- back — see settle_refund. Flipping it here would count an
         -- in-flight refund as complete in the revenue dashboard.
         updated_at          = now()
   where id = p_id
     and guest_id = v_uid
     and status <> 'cancelled';

  if not found then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;

  return json_build_object(
    'ok',             true,
    'booking_id',     p_id,
    'refund_amount',  v_amount,
    'refund_percent', v_pct,
    'refund_status',  case when v_amount > 0 then 'processing' else null end,
    'paid',           v_paid
  );
end;
$$;

revoke all on function public.cancel_my_booking(uuid, text) from public, anon;
grant execute on function public.cancel_my_booking(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Settle — processing → completed.
--
--    Separate from cancel so the two states are genuinely distinct. In Phase 1
--    the application calls this immediately; when a real provider refund is
--    wired up, this becomes the webhook handler and nothing above it changes.
--
--    Only this step sets payment_status='refunded', which is what the revenue
--    dashboard counts — so Refunds and Net Revenue move when the money does,
--    not when the request was made.
-- ---------------------------------------------------------------------------
create or replace function public.settle_refund(p_id uuid)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_amt numeric;
begin
  if v_uid is null then
    raise exception 'settle_refund: not signed in' using errcode = '42501';
  end if;

  update public.bookings
     set refund_status  = 'completed',
         refunded_at    = now(),
         payment_status = 'refunded',
         updated_at     = now()
   where id = p_id
     and refund_status = 'processing'
     -- The owner or an admin. A guest settling their own refund is only safe
     -- because the amount was computed server-side at cancellation and is not
     -- writable from a browser.
     and (guest_id = v_uid or public.is_admin())
  returning refunded_amount into v_amt;

  if not found then
    -- Already settled, or not in a settleable state. Idempotent by design: the
    -- client may retry, and a webhook may deliver twice.
    return json_build_object('ok', false, 'reason', 'not_processing');
  end if;

  return json_build_object('ok', true, 'booking_id', p_id, 'refund_amount', v_amt);
end;
$$;

revoke all on function public.settle_refund(uuid) from public, anon;
grant execute on function public.settle_refund(uuid) to authenticated;
