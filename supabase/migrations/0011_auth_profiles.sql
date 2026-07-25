-- ===========================================================================
-- 0011_auth_profiles.sql
-- Production auth: extend the existing `profiles` table (do NOT replace it) with
-- the fields the sign-up flow collects, keep it in sync with auth.users, and add
-- an admin-stats function. Authentication itself is handled by Supabase Auth
-- (auth.users holds the hashed password + session); `profiles` holds app data.
--
-- Safe to run more than once (idempotent: add-column-if-not-exists + or-replace).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend profiles with the sign-up fields
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists first_name     text;
alter table public.profiles add column if not exists last_name      text;
alter table public.profiles add column if not exists birthday       date;
alter table public.profiles add column if not exists email          text;
alter table public.profiles add column if not exists email_verified boolean not null default false;
alter table public.profiles add column if not exists last_login     timestamptz;
alter table public.profiles add column if not exists role           text not null default 'user';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user', 'host', 'admin'));
  end if;
end $$;

comment on column public.profiles.role is 'Authorization role: user (default), host, or admin.';

-- ---------------------------------------------------------------------------
-- 2. Auto-create / populate a profile on sign-up (extends the existing trigger)
--    Reads the first_name/last_name/birthday the sign-up form sends as user
--    metadata, mirrors the email, and seeds email_verified from auth.users.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_first     text  := nullif(trim(meta ->> 'first_name'), '');
  v_last      text  := nullif(trim(meta ->> 'last_name'), '');
  v_full      text  := nullif(trim(meta ->> 'full_name'), '');
  v_birthday  date;
begin
  begin
    v_birthday := nullif(meta ->> 'birthday', '')::date;
  exception when others then
    v_birthday := null;
  end;

  insert into public.profiles (
    id, first_name, last_name, full_name, birthday,
    email, email_verified, avatar_url, role
  )
  values (
    new.id,
    v_first,
    v_last,
    coalesce(v_full, nullif(trim(concat_ws(' ', v_first, v_last)), '')),
    v_birthday,
    new.email,
    new.email_confirmed_at is not null,
    nullif(meta ->> 'avatar_url', ''),
    'user'
  )
  on conflict (id) do update set
    first_name     = coalesce(excluded.first_name, public.profiles.first_name),
    last_name      = coalesce(excluded.last_name,  public.profiles.last_name),
    full_name      = coalesce(excluded.full_name,  public.profiles.full_name),
    birthday       = coalesce(excluded.birthday,   public.profiles.birthday),
    email          = excluded.email;

  return new;
end;
$$;

-- (trigger on_auth_user_created already created in 0002 — re-point it just in case)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Keep profiles.email / email_verified in sync when auth.users changes
--    (e.g. the user confirms their email or changes it).
-- ---------------------------------------------------------------------------
create or replace function public.sync_auth_user_to_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
     set email          = new.email,
         email_verified = new.email_confirmed_at is not null
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, email_confirmed_at on auth.users
  for each row execute function public.sync_auth_user_to_profile();

-- ---------------------------------------------------------------------------
-- 4. Admin statistics (for the future Admin Dashboard).
--    SECURITY DEFINER so it can count across all rows regardless of RLS, but
--    execution is restricted to the service_role (server-side) only.
-- ---------------------------------------------------------------------------
create or replace function public.get_user_stats()
returns json
language sql
security definer set search_path = public
stable
as $$
  select json_build_object(
    'total_users',   (select count(*) from public.profiles),
    'active_users',  (select count(*) from public.profiles
                        where last_login >= now() - interval '30 days'),
    'today',         (select count(*) from public.profiles
                        where created_at >= date_trunc('day', now())),
    'this_week',     (select count(*) from public.profiles
                        where created_at >= date_trunc('week', now())),
    'this_month',    (select count(*) from public.profiles
                        where created_at >= date_trunc('month', now()))
  );
$$;

revoke all on function public.get_user_stats() from public, anon, authenticated;
grant execute on function public.get_user_stats() to service_role;

-- ---------------------------------------------------------------------------
-- 5. Backfill: mirror existing auth.users into profiles (id, email, verified)
--    so pre-existing accounts get the new columns populated.
-- ---------------------------------------------------------------------------
update public.profiles p
   set email          = u.email,
       email_verified = u.email_confirmed_at is not null
  from auth.users u
 where u.id = p.id
   and (p.email is distinct from u.email
        or p.email_verified is distinct from (u.email_confirmed_at is not null));
