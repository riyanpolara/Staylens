-- ===========================================================================
-- 0018_razorpay_payments.sql
-- Payment-provider columns on `bookings` so a confirmed reservation records
-- HOW it was paid for, not just that it was.
--
-- `bookings` already carries reference, guest_id, property_id, check_in,
-- check_out, guests, nights, total_price, currency, status, payment_status,
-- commission and created_at (0004 + 0017). This adds only what a payment
-- gateway contributes.
--
-- Money note: total_price is stored in the booking's own `currency`. Razorpay
-- test accounts settle in INR, so a charge taken in INR is stored as INR with
-- currency = 'INR' — the row records what was actually charged rather than the
-- USD catalogue price it was derived from.
--
-- Safe to run more than once.
-- ===========================================================================

alter table public.bookings
  add column if not exists payment_provider    text,
  add column if not exists razorpay_order_id   text,
  add column if not exists razorpay_payment_id text,
  add column if not exists paid_at             timestamptz;

comment on column public.bookings.payment_provider is
  'Gateway that captured the payment, e.g. ''razorpay''.';
comment on column public.bookings.razorpay_order_id is
  'Razorpay order id (order_...). Unique — the idempotency key for capture.';
comment on column public.bookings.razorpay_payment_id is
  'Razorpay payment id (pay_...), returned by Checkout on success.';

-- One booking per Razorpay order. This is what makes verification idempotent:
-- a replayed callback cannot create a second booking for the same order.
create unique index if not exists uq_bookings_razorpay_order
  on public.bookings (razorpay_order_id)
  where razorpay_order_id is not null;

create index if not exists idx_bookings_razorpay_payment
  on public.bookings (razorpay_payment_id)
  where razorpay_payment_id is not null;

-- ---------------------------------------------------------------------------
-- RLS: a guest may read their own bookings.
--
-- Rows are INSERTED server-side by the verification step using the service
-- role, which bypasses RLS — deliberately, so a booking can only ever be
-- created after a signature has been verified, never straight from a client.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bookings'
      and policyname = 'bookings: guest reads own'
  ) then
    create policy "bookings: guest reads own" on public.bookings
      for select using (auth.uid() = guest_id or public.is_admin());
  end if;
end $$;
