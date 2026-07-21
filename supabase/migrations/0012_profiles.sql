-- ---------------------------------------------------------------------------
-- 0012_profiles.sql — user profile for the Edit Profile screen.
--
-- Single, self-contained table for the account/profile page. JSON columns keep
-- the flexible lists (personality, languages, connected accounts, privacy) in
-- one row so the form maps 1:1 to the UI. Apply, then the Edit Profile page
-- reads/writes real data instead of the built-in demo fallback.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id                 text primary key default 'profile',
  full_name          text        not null default '',
  legal_name         text        not null default '',
  location           text        not null default '',
  avatar_url         text,
  identity_verified  boolean     not null default false,
  email              text        not null default '',
  phone              text        not null default '',
  emergency_contact  text,
  about              text        not null default '',
  personality        jsonb       not null default '[]'::jsonb,
  languages          jsonb       not null default '[]'::jsonb,
  travel_history     jsonb       not null default '{}'::jsonb,
  connected_accounts jsonb       not null default '[]'::jsonb,
  privacy            jsonb       not null default '{"publicProfile":true,"showWishlists":false}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.profiles is 'Account profile shown on the Edit Profile page.';

-- Row Level Security: readable by anyone (public profile page), writes are done
-- server-side with the service role. Tighten to auth.uid() once auth lands.
alter table public.profiles enable row level security;

drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select using (true);

-- Seed the demo profile so the page has data immediately after migration.
insert into public.profiles (
  id, full_name, legal_name, location, avatar_url, identity_verified,
  email, phone, emergency_contact, about, personality, languages,
  travel_history, connected_accounts, privacy
) values (
  'profile',
  'Alex Rivera', 'Alex Rivera', 'Barcelona, Spain', null, true,
  'alex.rivera@staylens.com', '+34 6** *** 892', null,
  'Architect by day, traveler by nature. I seek spaces that blur the line between indoor comfort and outdoor serenity. Always looking for the perfect morning light and a quiet spot to sketch.',
  '["Quiet Seeker","Design Lover","Photography","Slow Travel"]'::jsonb,
  '[{"id":"en","name":"English","level":"Native","verified":true},{"id":"es","name":"Spanish","level":"Fluent","verified":true},{"id":"ca","name":"Catalan","level":"Intermediate","verified":true}]'::jsonb,
  '{"countries":14,"lastTrip":"Kyoto, Japan","coverImage":""}'::jsonb,
  '[{"provider":"facebook","connected":true},{"provider":"google","connected":false}]'::jsonb,
  '{"publicProfile":true,"showWishlists":false}'::jsonb
)
on conflict (id) do nothing;

-- Storage bucket for avatar uploads (public read).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
