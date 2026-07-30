-- 0020 — the profile fields the account page lets people edit.
--
-- `profiles` already existed and is already populated on signup by the
-- handle_new_user trigger (0011), so this only adds the columns the profile
-- screen needs and never touches identity. There is deliberately no new user
-- table: auth.users.id -> profiles.id stays the single link.
--
-- `bio` is reused for "About me" rather than adding an `about` column that
-- would mean the same thing.

alter table public.profiles
  add column if not exists legal_name         text,
  add column if not exists phone              text,
  add column if not exists location           text,
  add column if not exists emergency_contact  text,
  add column if not exists identity_verified  boolean not null default false,
  add column if not exists languages          jsonb   not null default '[]'::jsonb,
  add column if not exists personality        jsonb   not null default '[]'::jsonb,
  add column if not exists travel_preferences jsonb   not null default '[]'::jsonb,
  add column if not exists privacy            jsonb   not null default
    '{"publicProfile": true, "showWishlists": false}'::jsonb;

comment on column public.profiles.identity_verified is
  'Set only by a real verification flow — never by the guest editing their own profile.';
comment on column public.profiles.languages is
  'Array of {id,name,level,verified}. `verified` is system-set, not self-declared.';
comment on column public.profiles.privacy is
  'Guest-controlled visibility flags: {publicProfile, showWishlists}.';

-- Guests rate a stay out of 5. Null for the 43k imported Inside Airbnb rows,
-- which carry review text but no numeric score, so averages must ignore nulls.
alter table public.reviews
  add column if not exists rating smallint;

alter table public.reviews
  drop constraint if exists reviews_rating_range;
alter table public.reviews
  add constraint reviews_rating_range check (rating is null or rating between 1 and 5);

comment on column public.reviews.rating is
  '1-5 stars. Null for imported reviews that predate ratings — exclude from averages.';

-- Own reviews must be readable to count them; the catalogue policy already
-- allows public read, this makes the ownership path explicit and future-proof
-- if catalogue reads are ever narrowed.
drop policy if exists "reviews: author reads own" on public.reviews;
create policy "reviews: author reads own"
  on public.reviews for select
  using (author_user_id = (select auth.uid()));

-- Counting trips and reviews per guest.
create index if not exists idx_bookings_guest on public.bookings (guest_id);
create index if not exists idx_reviews_author on public.reviews (author_user_id)
  where author_user_id is not null;
