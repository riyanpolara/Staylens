-- ===========================================================================
-- 0014_admin_users.sql
-- Backend for the /admin/users screen: server-side pagination, search,
-- filtering, sorting, and the moderation actions (view, change role, suspend,
-- delete).
--
-- Follows the conventions already established by admin_bookings_list /
-- admin_properties_list in this database: an `admin_<entity>_list` function
-- returning a { rows, total, page, page_size, page_count } JSON envelope,
-- `admin_<entity>_detail(p_id)` for the detail panel, and
-- `admin_<entity>_set_<field>(p_id, …)` for mutations. Sorting is a
-- sort_txt/sort_val CASE pair ranked with row_number(), so no user string ever
-- reaches a dynamic ORDER BY.
--
-- DESIGN NOTES
--
-- 1. WHY FUNCTIONS AND NOT PLAIN .from('profiles') QUERIES
--    The screen needs a per-user booking count, a display name assembled from
--    four possible columns, `auth.users.last_sign_in_at`, and the unpaginated
--    total — in one round trip. PostgREST cannot join `auth.users`, and cannot
--    sort or search on a computed aggregate.
--
-- 2. WHY SECURITY DEFINER
--    These functions read `auth.users` and write `auth.users.banned_until`,
--    which the `authenticated` role cannot touch. Each opens with an
--    `is_admin()` guard and raises 42501 otherwise, so the elevated privilege
--    is only ever exercised on behalf of a verified admin. EXECUTE is granted
--    to `authenticated` (never `anon`) precisely because the guard, not the
--    grant, is what authorizes the call.
--
-- 3. NO SERVICE-ROLE KEY REQUIRED
--    Suspend and delete are the operations that normally force you to ship
--    SUPABASE_SERVICE_ROLE_KEY to the web tier and call the GoTrue admin API.
--    Doing it in SQL instead keeps a full-bypass key out of the app entirely:
--    the admin's own session authorizes the action.
--
-- 4. SELF-TARGETING IS BLOCKED
--    An admin cannot change their own role, suspend themselves, or delete
--    themselves — each is a way to lock the last admin out of the dashboard
--    from inside the dashboard.
--
-- Safe to run more than once. Requires public.is_admin() from 0013_admin_rls.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0. Prerequisite — fail loudly rather than creating functions whose
--    authorization guard silently does not exist.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.is_admin(uuid)') is null then
    raise exception
      '0014_admin_users.sql requires public.is_admin(uuid). Apply 0013_admin_rls.sql first.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Columns the Users screen shows but `profiles` did not have.
--
--    `status` is the app-level moderation state, deliberately separate from
--    `auth.users.banned_until` (the thing that actually blocks sign-in): the
--    column distinguishes "suspended" from "banned" and survives a GoTrue
--    schema change, while `banned_until` enforces it. admin_user_set_status()
--    writes both.
--
--    `country` has no upstream source — it is admin-maintained and renders as
--    "—" until set. It exists so the designed column has a real backing field
--    rather than a hard-coded placeholder.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists status  text not null default 'active';
alter table public.profiles add column if not exists country text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('active', 'pending', 'suspended', 'banned'));
  end if;
end $$;

comment on column public.profiles.status is
  'Moderation state: active | pending (email unconfirmed) | suspended | banned. Enforced via auth.users.banned_until.';
comment on column public.profiles.country is
  'Admin-maintained country label for the users dashboard. No upstream source.';

-- One-time seed from the auth record, so existing accounts do not all read
-- "active". Skipped once anything has been moderated — re-running this file
-- must not revert an admin's decision to activate an unconfirmed account.
do $$
begin
  if not exists (select 1 from public.profiles where status <> 'active') then
    update public.profiles p
       set status = case
             when u.banned_until is not null and u.banned_until > now() then 'suspended'
             else 'pending'
           end
      from auth.users u
     where u.id = p.id
       and (u.email_confirmed_at is null
            or (u.banned_until is not null and u.banned_until > now()));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Indexes for the list query. The display name is a coalesce() of four
--    columns that no single index can cover; what decides the plan on a large
--    table is the two filter columns and the default sort key.
-- ---------------------------------------------------------------------------
create index if not exists profiles_role_idx       on public.profiles (role);
create index if not exists profiles_status_idx     on public.profiles (status);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
create index if not exists profiles_full_name_idx  on public.profiles (lower(full_name));
create index if not exists profiles_email_idx      on public.profiles (lower(email));
-- The per-user booking count is a correlated subquery over guest_id.
create index if not exists bookings_guest_id_idx   on public.bookings (guest_id);

-- ---------------------------------------------------------------------------
-- 3. Shared row shape, factored into a view so the list and detail functions
--    cannot drift apart on how a name is derived or a booking counted.
-- ---------------------------------------------------------------------------
create or replace view public.admin_users_base
with (security_invoker = true) as
select
  p.id,
  coalesce(
    nullif(btrim(p.full_name), ''),
    nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
    nullif(btrim(p.username), ''),
    nullif(split_part(coalesce(p.email, u.email::text, ''), '@', 1), ''),
    'Unnamed user'
  )                                as name,
  coalesce(p.email, u.email::text) as email,
  p.avatar_url,
  p.country,
  p.role,
  p.status,
  p.created_at,
  u.last_sign_in_at,
  p.email_verified,
  u.banned_until,
  (select count(*) from public.bookings b where b.guest_id = p.id) as booking_count
from public.profiles p
left join auth.users u on u.id = p.id;

comment on view public.admin_users_base is
  'Denormalized user row for the admin dashboard (profile + auth + booking count). Internal to the admin_user* functions.';

-- security_invoker means the view carries no privileges of its own: reading it
-- needs rights on profiles AND auth.users, which only the owner of the
-- SECURITY DEFINER functions below has. The revoke makes that explicit against
-- Supabase's default grants on the public schema.
revoke all on public.admin_users_base from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. List — one round trip for the page of rows plus the unpaginated total.
-- ---------------------------------------------------------------------------
create or replace function public.admin_users_list(
  p_search    text default null,
  p_role      text default null,
  p_status    text default null,
  p_sort      text default 'created_at',
  p_dir       text default 'desc',
  p_page      int  default 1,
  p_page_size int  default 10
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_page   int     := greatest(coalesce(p_page, 1), 1);
  v_size   int     := least(greatest(coalesce(p_page_size, 10), 1), 100);
  v_offset int;
  v_q      text    := nullif(btrim(coalesce(p_search, '')), '');
  v_role   text    := nullif(lower(btrim(coalesce(p_role, ''))), '');
  v_status text    := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_sort   text    := lower(btrim(coalesce(p_sort, 'created_at')));
  v_asc    boolean := lower(btrim(coalesce(p_dir, 'desc'))) = 'asc';
  v_total  int;
  v_rows   json;
begin
  if not public.is_admin() then
    raise exception 'admin_users_list: forbidden' using errcode = '42501';
  end if;

  if v_role   = 'all' then v_role   := null; end if;
  if v_status = 'all' then v_status := null; end if;
  v_offset := (v_page - 1) * v_size;

  -- Escape LIKE metacharacters so a search for "100%" or "a_b" stays literal
  -- instead of matching everything.
  if v_q is not null then
    v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with filtered as (
    select b.*
      from public.admin_users_base b
     where (v_role   is null or b.role   = v_role)
       and (v_status is null or b.status = v_status)
       and (
         v_q is null
         or b.name                   ilike v_q
         or coalesce(b.email, '')    ilike v_q
         or coalesce(b.country, '')  ilike v_q
       )
  ),
  keyed as (
    select f.*,
           case v_sort
             when 'name'    then lower(f.name)
             when 'email'   then lower(coalesce(f.email, ''))
             when 'country' then lower(coalesce(f.country, ''))
             when 'role'    then f.role
             when 'status'  then f.status
             else null
           end as sort_txt,
           case v_sort
             when 'last_sign_in_at' then extract(epoch from f.last_sign_in_at)
             when 'booking_count'   then f.booking_count::numeric
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
                  'id',              o.id,
                  'name',            o.name,
                  'email',           o.email,
                  'avatar_url',      o.avatar_url,
                  'country',         o.country,
                  'role',            o.role,
                  'status',          o.status,
                  'created_at',      o.created_at,
                  'last_sign_in_at', o.last_sign_in_at,
                  'email_verified',  o.email_verified,
                  'booking_count',   o.booking_count
                ) order by o.rn)
         from ordered o
        where o.rn > v_offset and o.rn <= v_offset + v_size),
      '[]'::json)
  into v_total, v_rows;

  return json_build_object(
    'rows',       v_rows,
    'total',      v_total,
    'page',       v_page,
    'page_size',  v_size,
    'page_count', greatest(ceil(v_total::numeric / v_size)::int, 1)
  );
end;
$fn$;

comment on function public.admin_users_list(text, text, text, text, text, int, int) is
  'Admin users list: server-side search + role/status filter + sort + page. Returns { rows, total, page, page_size, page_count }.';

-- ---------------------------------------------------------------------------
-- 5. Detail — everything the user-details modal shows, as one JSON document.
-- ---------------------------------------------------------------------------
create or replace function public.admin_user_detail(p_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_result json;
begin
  if not public.is_admin() then
    raise exception 'admin_user_detail: forbidden' using errcode = '42501';
  end if;

  select json_build_object(
    'id',              b.id,
    'name',            b.name,
    'email',           b.email,
    'avatar_url',      b.avatar_url,
    'country',         b.country,
    'role',            b.role,
    'status',          b.status,
    'created_at',      b.created_at,
    'last_sign_in_at', b.last_sign_in_at,
    'email_verified',  b.email_verified,
    'banned_until',    b.banned_until,
    'booking_count',   b.booking_count,
    'username',        p.username,
    'bio',             p.bio,
    'birthday',        p.birthday,
    'home_currency',   p.home_currency,
    'updated_at',      p.updated_at,
    'bookings_upcoming', (
      select count(*) from public.bookings x
       where x.guest_id = b.id
         and x.check_in >= current_date
         and x.status in ('pending', 'confirmed')),
    'bookings_cancelled', (
      select count(*) from public.bookings x
       where x.guest_id = b.id and x.status in ('cancelled', 'declined')),
    'total_spend', (
      select coalesce(sum(x.total_price), 0) from public.bookings x
       where x.guest_id = b.id and x.status <> 'cancelled'),
    'favorites_count', (select count(*) from public.favorites f where f.user_id = b.id),
    'saved_count',     (select count(*) from public.bookmarks k where k.user_id = b.id),
    'recent_bookings', coalesce((
      select json_agg(
               json_build_object(
                 'id',          rb.id,
                 'reference',   rb.reference,
                 'property',    rb.property_name,
                 'check_in',    rb.check_in,
                 'check_out',   rb.check_out,
                 'nights',      rb.nights,
                 'total_price', rb.total_price,
                 'currency',    rb.currency,
                 'status',      rb.status,
                 'created_at',  rb.created_at
               ) order by rb.created_at desc)
        from (
          select v.id, v.reference, v.property_name, v.check_in, v.check_out,
                 v.nights, v.total_price, v.currency, v.status::text as status,
                 v.created_at
            from public.admin_bookings_view v
           where v.guest_id = b.id
           order by v.created_at desc
           limit 5
        ) rb), '[]'::json)
  )
    into v_result
    from public.admin_users_base b
    join public.profiles p on p.id = b.id
   where b.id = p_id;

  return v_result; -- null when no such user; the caller renders "not found"
end;
$fn$;

comment on function public.admin_user_detail(uuid) is
  'Admin user-details payload: profile + auth + booking stats + 5 most recent bookings.';

-- ---------------------------------------------------------------------------
-- 6. Change role.
-- ---------------------------------------------------------------------------
create or replace function public.admin_user_set_role(p_id uuid, p_role text)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_old text;
begin
  if not public.is_admin() then
    raise exception 'admin_user_set_role: forbidden' using errcode = '42501';
  end if;

  -- Mirrors profiles_role_check, checked here so the caller gets a usable
  -- message rather than a raw constraint-violation string.
  if p_role is null or p_role not in ('user', 'host', 'admin') then
    raise exception 'Unknown role "%". Expected user, host or admin.', p_role
      using errcode = '22023';
  end if;

  if p_id = auth.uid() then
    raise exception 'You cannot change your own role.' using errcode = '42501';
  end if;

  select role into v_old from public.profiles where id = p_id;
  if v_old is null then
    raise exception 'No such user.' using errcode = 'P0002';
  end if;

  update public.profiles set role = p_role, updated_at = now() where id = p_id;

  return json_build_object('id', p_id, 'previous_role', v_old, 'role', p_role);
end;
$fn$;

comment on function public.admin_user_set_role(uuid, text) is
  'Sets profiles.role. Refuses to change the calling admin''s own role.';

-- ---------------------------------------------------------------------------
-- 7. Suspend / ban / reactivate.
--
--    Writing profiles.status alone would be cosmetic — a suspended user would
--    keep browsing on their existing access token. So this also sets
--    auth.users.banned_until (what GoTrue checks on sign-in and refresh) and
--    drops their live sessions, which signs them out within one token cycle.
--
--    100 years rather than 'infinity': it matches what the GoTrue admin API
--    writes for ban_duration and stays inside a Go time.Time.
-- ---------------------------------------------------------------------------
create or replace function public.admin_user_set_status(p_id uuid, p_status text)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_old     text;
  v_blocked boolean;
begin
  if not public.is_admin() then
    raise exception 'admin_user_set_status: forbidden' using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('active', 'pending', 'suspended', 'banned') then
    raise exception 'Unknown status "%". Expected active, pending, suspended or banned.', p_status
      using errcode = '22023';
  end if;

  if p_id = auth.uid() then
    raise exception 'You cannot change your own status.' using errcode = '42501';
  end if;

  select status into v_old from public.profiles where id = p_id;
  if v_old is null then
    raise exception 'No such user.' using errcode = 'P0002';
  end if;

  v_blocked := p_status in ('suspended', 'banned');

  update public.profiles set status = p_status, updated_at = now() where id = p_id;

  update auth.users
     set banned_until = case when v_blocked then now() + interval '100 years' end
   where id = p_id;

  if v_blocked then
    -- Revoke what is already issued. Deleting the session cascades to its
    -- refresh tokens, but being explicit keeps this correct if that FK ever
    -- changes. refresh_tokens.user_id is varchar, so compare as text rather
    -- than casting stored rows to uuid.
    delete from auth.refresh_tokens where user_id = p_id::text;
    delete from auth.sessions        where user_id = p_id;
  end if;

  return json_build_object(
    'id', p_id, 'previous_status', v_old, 'status', p_status,
    'sessions_revoked', v_blocked
  );
end;
$fn$;

comment on function public.admin_user_set_status(uuid, text) is
  'Sets profiles.status and enforces it: suspended/banned also set auth.users.banned_until and revoke live sessions.';

-- ---------------------------------------------------------------------------
-- 8. Delete.
--
--    Deletes the auth record; `profiles.id references auth.users on delete
--    cascade` takes the profile, favorites, bookmarks and chat history with
--    it, and reviews.author_user_id is set null (the review text survives
--    anonymously).
--
--    bookings.guest_id is ON DELETE RESTRICT, so a guest with booking history
--    cannot be erased. Rather than surface a bare foreign-key error — or
--    quietly destroy financial records to make the delete succeed — this
--    counts them first and tells the admin to ban the account instead.
-- ---------------------------------------------------------------------------
create or replace function public.admin_user_delete(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_email    text;
  v_exists   boolean;
  v_bookings bigint;
begin
  if not public.is_admin() then
    raise exception 'admin_user_delete: forbidden' using errcode = '42501';
  end if;

  if p_id = auth.uid() then
    raise exception 'You cannot delete your own account from the dashboard.'
      using errcode = '42501';
  end if;

  select coalesce(p.email, u.email::text), true
    into v_email, v_exists
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = p_id;

  if not coalesce(v_exists, false) then
    raise exception 'No such user.' using errcode = 'P0002';
  end if;

  select count(*) into v_bookings from public.bookings where guest_id = p_id;
  if v_bookings > 0 then
    raise exception
      'This account has % booking(s) and cannot be deleted — booking records are retained. Ban the account instead.',
      v_bookings using errcode = '23503';
  end if;

  delete from auth.users where id = p_id;

  return json_build_object('id', p_id, 'email', v_email, 'deleted', true);
end;
$fn$;

comment on function public.admin_user_delete(uuid) is
  'Hard-deletes the auth user (profile cascades). Refuses when the account has bookings, or when it is the caller''s own.';

-- ---------------------------------------------------------------------------
-- 9. Grants. `anon` gets nothing; `authenticated` gets EXECUTE because the
--    is_admin() guard inside each function is what authorizes the call.
-- ---------------------------------------------------------------------------
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.admin_users_list(text, text, text, text, text, int, int)',
    'public.admin_user_detail(uuid)',
    'public.admin_user_set_role(uuid, text)',
    'public.admin_user_set_status(uuid, text)',
    'public.admin_user_delete(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Retire the first-draft names (admin_users_page / admin_set_user_role /
--     admin_set_user_status / admin_delete_user). Nothing references them;
--     dropping keeps one name per operation.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_users_page(text, text, text, text, text, int, int);
drop function if exists public.admin_set_user_role(uuid, text);
drop function if exists public.admin_set_user_status(uuid, text);
drop function if exists public.admin_delete_user(uuid);
