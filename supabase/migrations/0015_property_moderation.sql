-- ===========================================================================
-- 0015_property_moderation.sql
-- Everything the /admin/properties screen needs from the database.
--
-- The imported catalog has no moderation model: `properties` only carries
-- `is_active`, while the admin UI is specified against
-- `status ∈ (live, pending, suspended, draft)` + `is_featured`
-- (staylens-admin-dashboard/project/handoff-spec.md). This migration adds
-- those columns, keeps `is_active` in lock-step with `status` so every public
-- query (`lib/queries.ts`, `lib/stay-filters.ts`) keeps working untouched, and
-- ships the two admin-only RPCs the screen reads through.
--
-- Requires 0013_admin_rls.sql (defines public.is_admin()).
-- Safe to run more than once.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Moderation columns
-- ---------------------------------------------------------------------------
do $$ begin
    create type property_status_enum as enum ('live', 'pending', 'suspended', 'draft');
exception when duplicate_object then null; end $$;

alter table public.properties
    add column if not exists status          property_status_enum,
    add column if not exists is_featured     boolean not null default false,
    add column if not exists moderation_note text,
    add column if not exists reviewed_at     timestamptz,
    add column if not exists reviewed_by     uuid references public.profiles (id) on delete set null;

comment on column public.properties.status is
  'Moderation state. is_active is derived from this by trg_properties_status_sync.';
comment on column public.properties.is_featured is
  'Promoted on the public site; set from the admin dashboard.';
comment on column public.properties.moderation_note is
  'Reviewer''s reason, captured when a listing is rejected/suspended.';

-- Backfill: every imported listing is already public, so it is live. Anything
-- flagged inactive by the ETL becomes suspended.
update public.properties
   set status = (case when is_active then 'live' else 'suspended' end)::property_status_enum
 where status is null;

alter table public.properties
    alter column status set default 'live',
    alter column status set not null;

-- ---------------------------------------------------------------------------
-- 2. status ⇄ is_active sync
--    The public site filters on `is_active`; the admin drives `status`. Keeping
--    the two in step in a trigger means no public query has to change, and a
--    suspended listing genuinely disappears from search + AI recommendations.
-- ---------------------------------------------------------------------------
create or replace function public.sync_property_active()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'INSERT' then
        -- `status` always has its default here (defaults land before BEFORE
        -- triggers), so an explicit is_active = false is the only signal that
        -- the writer meant "not public".
        if not new.is_active and new.status = 'live' then
            new.status := 'suspended';
        else
            new.is_active := (new.status = 'live');
        end if;
    elsif new.status is distinct from old.status then
        new.is_active := (new.status = 'live');
    elsif new.is_active is distinct from old.is_active then
        new.status := (case when new.is_active then 'live' else 'suspended' end)::property_status_enum;
    end if;
    return new;
end;
$$;

comment on function public.sync_property_active() is
  'Keeps properties.is_active derived from properties.status (and vice versa).';

drop trigger if exists trg_properties_status_sync on public.properties;
create trigger trg_properties_status_sync
    before insert or update on public.properties
    for each row execute function public.sync_property_active();

-- ---------------------------------------------------------------------------
-- 3. Indexes for the admin table's filter axes.
--
--    Only what EXPLAIN ANALYZE actually uses. Deliberately NOT added:
--      · a btree on created_at — every imported listing shares one bulk-import
--        timestamp, so it cannot help the default "newest first" ordering;
--      · a trigram index on hosts.name — the admin search ORs across the
--        properties⋈hosts join, which no single-table index can satisfy.
--    The search seq-scans 6.5k rows in ~45 ms warm, which is well inside
--    budget for this screen; revisit if the catalog grows an order of
--    magnitude.
-- ---------------------------------------------------------------------------
create index if not exists idx_properties_status      on public.properties (status);
create index if not exists idx_properties_is_featured on public.properties (is_featured) where is_featured;
-- Public search (`lib/stay-filters.ts`) ORs city/country/suburb on one table,
-- which a BitmapOr can serve; `name` already has its trigram index from 0005.
create index if not exists idx_properties_city_trgm
    on public.properties using gin (city extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 4. Admin delete
--    0013 granted admins UPDATE on properties; the dashboard's row menu also
--    deletes. bookings.property_id is ON DELETE RESTRICT, so a listing with
--    booking history cannot be erased — the UI surfaces that as an error.
-- ---------------------------------------------------------------------------
drop policy if exists "properties: admin delete" on public.properties;
create policy "properties: admin delete" on public.properties
    for delete using (public.is_admin());

-- ===========================================================================
-- 5. admin_properties_list — one round trip for the table
--    Search + status/type/featured filters + sort + page + total. Doing it in
--    SQL matters: `properties` has ~6.5k rows, and the client must never
--    download them just to count or paginate.
--
--    SECURITY DEFINER with an explicit is_admin() guard: the function reads
--    across RLS, so authorization is enforced in the body, not by policy.
-- ===========================================================================
create or replace function public.admin_properties_list(
    p_search    text    default null,
    p_status    text    default null,   -- null / '' = all
    p_type      text    default null,   -- room_type_enum label
    p_featured  boolean default null,
    p_sort      text    default 'created_at',
    p_dir       text    default 'desc',
    p_page      int     default 1,
    p_page_size int     default 10
)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
    v_search  text := nullif(btrim(coalesce(p_search, '')), '');
    v_status  text := nullif(btrim(coalesce(p_status, '')), '');
    v_type    text := nullif(btrim(coalesce(p_type, '')), '');
    v_sort    text;
    v_dir     text;
    v_limit   int;
    v_offset  int;
    v_result  json;
begin
    if not public.is_admin() then
        raise exception 'admin_properties_list: forbidden' using errcode = '42501';
    end if;

    if v_status is not null and v_status not in ('live', 'pending', 'suspended', 'draft') then
        raise exception 'admin_properties_list: unknown status %', v_status using errcode = '22023';
    end if;
    if v_type is not null and v_type not in ('Entire home/apt', 'Private room', 'Shared room', 'Hotel room') then
        raise exception 'admin_properties_list: unknown room type %', v_type using errcode = '22023';
    end if;

    v_limit  := least(greatest(coalesce(p_page_size, 10), 1), 100);
    v_offset := (greatest(coalesce(p_page, 1), 1) - 1) * v_limit;

    -- Sort key and direction are interpolated into ORDER BY, so they are
    -- resolved through a whitelist and never taken from the caller verbatim.
    v_sort := case lower(coalesce(p_sort, 'created_at'))
        when 'title'    then 'b.name'
        when 'host'     then 'b.host_name'
        when 'location' then 'b.city'
        when 'price'    then 'b.price'
        when 'rating'   then 'b.review_scores_rating'
        when 'reviews'  then 'b.number_of_reviews'
        when 'bookings' then 'b.booking_count'
        when 'status'   then 'b.status::text'
        when 'featured' then 'b.is_featured'
        else 'b.created_at'
    end;
    v_dir := case when lower(coalesce(p_dir, 'desc')) = 'asc' then 'asc' else 'desc' end;

    execute format($q$
        with base as (
            select p.id, p.name, p.city, p.country, p.price, p.currency,
                   p.status, p.is_featured, p.created_at,
                   p.review_scores_rating, p.number_of_reviews,
                   coalesce(p.property_type, p.room_type::text) as type_label,
                   h.id   as host_id,
                   h.name as host_name,
                   coalesce(bk.n, 0) as booking_count
              from public.properties p
              left join public.hosts h on h.id = p.host_id
              left join (
                    select property_id, count(*)::int as n
                      from public.bookings group by property_id
              ) bk on bk.property_id = p.id
             where ($1 is null
                    or p.name    ilike '%%' || $1 || '%%'
                    or p.city    ilike '%%' || $1 || '%%'
                    or p.country ilike '%%' || $1 || '%%'
                    or h.name    ilike '%%' || $1 || '%%')
               and ($2 is null or p.status::text = $2)
               and ($3 is null or p.room_type::text = $3)
               and ($4 is null or p.is_featured = $4)
        )
        select json_build_object(
            'total', (select count(*) from base),
            'rows', coalesce((
                select json_agg(row_to_json(r))
                  from (
                    select b.id,
                           b.name                              as title,
                           coalesce(b.type_label, 'Unknown')   as type,
                           json_build_object('id', b.host_id, 'name',
                                             coalesce(b.host_name, 'Unknown host')) as host,
                           coalesce(b.city, '—')               as city,
                           coalesce(b.country, '—')            as country,
                           coalesce(b.price, 0)                as price_per_night,
                           b.currency,
                           b.status::text                      as status,
                           b.is_featured,
                           -- review_scores_rating is stored 0..100; the UI shows 0..5
                           case when b.review_scores_rating is null then null
                                else round((b.review_scores_rating / 20.0)::numeric, 2) end
                                                               as rating_avg,
                           b.number_of_reviews                 as review_count,
                           b.booking_count,
                           (select i.url from public.property_images i
                             where i.property_id = b.id
                             order by i.is_primary desc nulls last, i.sort_order nulls last
                             limit 1)                          as cover_image_url,
                           b.created_at
                      from base b
                     order by %s %s nulls last, b.id
                     limit $5 offset $6
                  ) r
            ), '[]'::json)
        )
    $q$, v_sort, v_dir)
    into v_result
    using v_search, v_status, v_type, p_featured, v_limit, v_offset;

    return v_result;
end;
$$;

comment on function public.admin_properties_list(text, text, text, boolean, text, text, int, int) is
  'Paged/filtered/sorted property list for the admin dashboard. Admin-only.';

revoke all on function public.admin_properties_list(text, text, text, boolean, text, text, int, int)
    from public, anon;
grant execute on function public.admin_properties_list(text, text, text, boolean, text, text, int, int)
    to authenticated, service_role;

-- ===========================================================================
-- 6. admin_property_detail — the View / Edit screens
-- ===========================================================================
create or replace function public.admin_property_detail(p_id uuid)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
    result json;
begin
    if not public.is_admin() then
        raise exception 'admin_property_detail: forbidden' using errcode = '42501';
    end if;

    select json_build_object(
        'id', p.id,
        'title', p.name,
        'summary', p.summary,
        'description', p.description,
        'house_rules', p.house_rules,
        'type', coalesce(p.property_type, p.room_type::text, 'Unknown'),
        'property_type', p.property_type,
        'room_type', p.room_type::text,
        'status', p.status::text,
        'is_featured', p.is_featured,
        'moderation_note', p.moderation_note,
        'reviewed_at', p.reviewed_at,
        'city', p.city,
        'country', p.country,
        'street', p.street,
        'latitude', p.latitude,
        'longitude', p.longitude,
        'price_per_night', coalesce(p.price, 0),
        'currency', p.currency,
        'cleaning_fee', p.cleaning_fee,
        'security_deposit', p.security_deposit,
        'minimum_nights', p.minimum_nights,
        'maximum_nights', p.maximum_nights,
        'accommodates', p.accommodates,
        'bedrooms', p.bedrooms,
        'beds', p.beds,
        'bathrooms', p.bathrooms,
        'cancellation_policy', p.cancellation_policy,
        'listing_url', p.listing_url,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'rating_avg', case when p.review_scores_rating is null then null
                           else round((p.review_scores_rating / 20.0)::numeric, 2) end,
        'review_count', p.number_of_reviews,
        'booking_count', (select count(*) from public.bookings b where b.property_id = p.id),
        'host', case when h.id is null then null else json_build_object(
                    'id', h.id,
                    'name', coalesce(h.name, 'Unknown host'),
                    'picture_url', h.picture_url,
                    'is_superhost', h.is_superhost,
                    'identity_verified', h.identity_verified,
                    'response_rate', h.response_rate,
                    'listings_count', h.listings_count,
                    'location', h.location
                ) end,
        'reviewed_by', (select coalesce(pr.full_name, pr.email)
                          from public.profiles pr where pr.id = p.reviewed_by),
        'images', coalesce((
            select json_agg(json_build_object('url', i.url, 'caption', i.caption)
                            order by i.is_primary desc nulls last, i.sort_order nulls last)
              from public.property_images i where i.property_id = p.id
        ), '[]'::json),
        'amenities', coalesce((
            select json_agg(a.name order by a.name)
              from public.property_amenities pa
              join public.amenities a on a.id = pa.amenity_id
             where pa.property_id = p.id
        ), '[]'::json),
        'recent_reviews', coalesce((
            select json_agg(json_build_object(
                       'id', r.id, 'reviewer', r.reviewer_name,
                       'date', r.review_date, 'comments', left(r.comments, 400)))
              from (select * from public.reviews rv
                     where rv.property_id = p.id
                     order by rv.review_date desc nulls last
                     limit 5) r
        ), '[]'::json)
    )
    into result
    from public.properties p
    left join public.hosts h on h.id = p.host_id
    where p.id = p_id;

    return result;   -- null when no such listing
end;
$$;

comment on function public.admin_property_detail(uuid) is
  'Full listing record + host, media, amenities and latest reviews. Admin-only.';

revoke all on function public.admin_property_detail(uuid) from public, anon;
grant execute on function public.admin_property_detail(uuid) to authenticated, service_role;
