-- ============================================================================
-- StayLens · Migration 0006 · Row-Level Security
-- ----------------------------------------------------------------------------
-- Catalog data (properties, hosts, images, amenities, reviews) is world-readable
-- so the public site + anon key can browse. Writes are restricted to the
-- service role (ETL) via the absence of write policies. User-owned tables are
-- locked to auth.uid().
-- ============================================================================

-- ---- Enable RLS on every table -------------------------------------------
alter table profiles           enable row level security;
alter table hosts              enable row level security;
alter table properties         enable row level security;
alter table property_images    enable row level security;
alter table amenities          enable row level security;
alter table property_amenities enable row level security;
alter table reviews            enable row level security;
alter table favorites          enable row level security;
alter table bookmarks          enable row level security;
alter table chat_sessions      enable row level security;
alter table chat_messages      enable row level security;
alter table bookings           enable row level security;

-- ===========================================================================
-- Public, read-only catalog
-- (service_role bypasses RLS entirely, so ETL/import is unaffected)
-- ===========================================================================
create policy "catalog: public read hosts"        on hosts              for select using (true);
create policy "catalog: public read properties"   on properties         for select using (true);
create policy "catalog: public read images"       on property_images    for select using (true);
create policy "catalog: public read amenities"    on amenities          for select using (true);
create policy "catalog: public read prop_amen"    on property_amenities for select using (true);
create policy "catalog: public read reviews"      on reviews            for select using (true);

-- ===========================================================================
-- profiles — public read, self write
-- ===========================================================================
create policy "profiles: public read"    on profiles for select using (true);
create policy "profiles: self update"    on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: self insert"    on profiles for insert with check (auth.uid() = id);

-- ===========================================================================
-- favorites — owner-only CRUD
-- ===========================================================================
create policy "favorites: select own" on favorites for select using (auth.uid() = user_id);
create policy "favorites: insert own" on favorites for insert with check (auth.uid() = user_id);
create policy "favorites: delete own" on favorites for delete using (auth.uid() = user_id);

-- ===========================================================================
-- bookmarks — owner-only CRUD
-- ===========================================================================
create policy "bookmarks: select own" on bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks: insert own" on bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks: update own" on bookmarks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bookmarks: delete own" on bookmarks for delete using (auth.uid() = user_id);

-- ===========================================================================
-- AI chat — owner-only, messages scoped through their session
-- ===========================================================================
create policy "chat_sessions: crud own" on chat_sessions
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "chat_messages: select own" on chat_messages for select
    using (exists (select 1 from chat_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "chat_messages: insert own" on chat_messages for insert
    with check (exists (select 1 from chat_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- ===========================================================================
-- bookings — guest can see & manage their own bookings
-- ===========================================================================
create policy "bookings: select own" on bookings for select using (auth.uid() = guest_id);
create policy "bookings: insert own" on bookings for insert with check (auth.uid() = guest_id);
create policy "bookings: update own" on bookings for update using (auth.uid() = guest_id) with check (auth.uid() = guest_id);
