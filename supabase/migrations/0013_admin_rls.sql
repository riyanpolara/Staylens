-- ===========================================================================
-- 0013_admin_rls.sql
-- Authorization for the /admin dashboard.
--
-- Two problems this fixes:
--
-- 1. The user-scoped tables (bookings, favorites, …) are restricted to
--    `auth.uid() = owner`, so an admin could only ever see their OWN rows —
--    the dashboard's Bookings screen would render empty. Each of those tables
--    gets an admin-override SELECT policy.
--
-- 2. `profiles` was `for select using (true)`, meaning anyone holding the
--    publishable key could list every user's email AND role — which also lets
--    an attacker enumerate admin accounts. It is narrowed to self-or-admin.
--
-- Safe to run more than once.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Role helper
--    SECURITY DEFINER so the lookup cannot be blocked by (or recurse into) the
--    profiles policies it is used by. STABLE so the planner calls it once per
--    statement rather than per row.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

comment on function public.is_admin(uuid) is
  'True when the given (default: current) user has profiles.role = admin.';

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. profiles — stop leaking every user's email/role to anonymous callers.
--    Self-read keeps the navbar/profile working; admins keep full visibility
--    for the dashboard's Users screen.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: public read" on public.profiles;
drop policy if exists "profiles_read"        on public.profiles;
drop policy if exists "profiles: self or admin read" on public.profiles;

create policy "profiles: self or admin read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles: admin update" on public.profiles;
create policy "profiles: admin update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Admin read-through on the owner-scoped tables the dashboard reports on.
--    The existing "select own" policies stay; PostgreSQL ORs permissive
--    policies together, so ordinary users are unaffected.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'bookings', 'favorites', 'bookmarks', 'chat_sessions', 'chat_messages'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || ': admin read', t);
      execute format(
        'create policy %I on public.%I for select using (public.is_admin())',
        t || ': admin read', t
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Admin write access for the moderation actions the dashboard exposes
--    (feature / suspend a listing). Catalog tables stay publicly readable —
--    the public site depends on that.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['properties', 'hosts'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || ': admin update', t);
      execute format(
        'create policy %I on public.%I for update using (public.is_admin()) with check (public.is_admin())',
        t || ': admin update', t
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Promoting the first admin.
--    No email or password is hard-coded here. Sign up through the app first,
--    then run ONE of the statements below in the Supabase SQL editor
--    (the SQL editor runs as a superuser, so it bypasses RLS):
--
--      -- by email:
--      update public.profiles
--         set role = 'admin'
--       where id = (select id from auth.users where email = 'you@example.com');
--
--      -- or by user id (Authentication → Users → copy UUID):
--      update public.profiles set role = 'admin' where id = '<uuid>';
--
--    Verify:
--      select p.id, p.email, p.role from public.profiles p where p.role = 'admin';
-- ---------------------------------------------------------------------------
