-- 0019 — make the Razorpay order id usable as an ON CONFLICT target.
--
-- 0018 created the uniqueness guarantee as a PARTIAL index:
--
--   create unique index uq_bookings_razorpay_order
--     on public.bookings (razorpay_order_id)
--     where razorpay_order_id is not null;
--
-- That enforces the constraint correctly, but Postgres cannot *infer* a partial
-- index from `on conflict (razorpay_order_id)` — the inference clause would
-- have to repeat the predicate, which PostgREST/supabase-js cannot express.
-- Every booking upsert therefore failed with:
--
--   42P10: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- The `where` clause was never needed. A plain unique index treats NULLs as
-- distinct, so bookings taken through any other payment route (or none) can
-- still have a null razorpay_order_id without colliding. Same guarantee,
-- inferrable target.

drop index if exists public.uq_bookings_razorpay_order;

create unique index if not exists uq_bookings_razorpay_order
  on public.bookings (razorpay_order_id);

comment on index public.uq_bookings_razorpay_order is
  'Idempotency key for Razorpay capture. Not partial, so it can be used as an '
  'ON CONFLICT target; NULLs remain distinct for non-Razorpay bookings.';
