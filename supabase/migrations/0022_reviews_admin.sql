-- ===========================================================================
-- 0022_reviews_admin.sql
-- Backend for the /admin/reviews screen: server-side pagination, search,
-- filtering, sorting, and the moderation actions (approve, reject, restore,
-- delete).
--
-- Follows the conventions established by 0014_admin_users.sql and
-- 0017_bookings_admin.sql: an `admin_<entity>_list` returning a
-- { rows, total, page, page_size, page_count } JSON envelope,
-- `admin_<entity>_detail(p_id)` for the detail panel, and a
-- `admin_review_set_status(p_id, …)` mutation. Sorting is a sort_txt/sort_val
-- CASE pair ranked with row_number(), so no user string ever reaches a dynamic
-- ORDER BY.
--
-- DESIGN NOTES
--
-- 1. MODERATION HAS TO ACTUALLY DO SOMETHING
--    `reviews` had no moderation column, so "reject" would have been a flag
--    nobody enforced. Section 3 narrows the public read policy to published
--    rows, which is what makes rejecting or deleting a review remove it from
--    the property page. All 43,307 existing rows are backfilled to 'published',
--    so the public site is unchanged the moment this runs.
--
-- 2. DELETE IS SOFT
--    "Restore review" only means something if delete is reversible, so delete
--    sets status = 'deleted' rather than removing the row. Nothing here purges
--    a review permanently — that would need a separate, deliberately explicit
--    function, and it is not one of the requested actions.
--
-- 3. WHY FUNCTIONS AND NOT PLAIN .from('reviews') QUERIES
--    The list needs the reviewer (either an imported name or a joined profile),
--    the property, that property's host, and the unpaginated total in one round
--    trip, with search and sort across all of them. PostgREST cannot sort or
--    search on a joined column, and cannot return the total alongside a page.
--
-- 4. WHY SECURITY DEFINER
--    The list must see rows the caller's own RLS would hide — that is the whole
--    point of a moderation queue: rejected and deleted reviews are invisible to
--    everyone else. Each function opens with an `is_admin()` guard and raises
--    42501 otherwise, so the elevated privilege is only ever exercised for a
--    verified admin. EXECUTE is granted to `authenticated`, never `anon`.
--
-- 5. NO DYNAMIC SQL
--    Every filter and sort key is compared against a fixed set inside the
--    function body. A hand-edited URL can produce an unknown sort key, which
--    falls through to the default rather than reaching the planner.
--
-- Safe to run more than once. Requires public.is_admin() from 0013_admin_rls
-- and pg_trgm (already installed for hybrid search).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0. Prerequisites — fail loudly rather than creating functions whose
--    authorization guard silently does not exist.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.is_admin(uuid)') is null then
    raise exception
      '0022_reviews_admin.sql requires public.is_admin(uuid). Apply 0013_admin_rls.sql first.';
  end if;
end $$;

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- 1. Moderation state.
--
--    Mirrors the vocabulary 0015 established for properties: a status enum plus
--    moderation_note / reviewed_at / reviewed_by, so both moderation queues
--    read the same way.
--
--      published  visible on the property page (the default, and what every
--                 imported row becomes)
--      pending    awaiting a decision — where guest-written reviews will land
--                 once a submission form exists
--      rejected   refused by an admin; hidden from the public site
--      deleted    soft-deleted; hidden, and restorable
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'review_status_enum') then
    create type review_status_enum as enum ('published', 'pending', 'rejected', 'deleted');
  end if;
end $$;

alter table public.reviews
  add column if not exists status          review_status_enum,
  add column if not exists moderation_note text,
  add column if not exists reviewed_at     timestamptz,
  add column if not exists reviewed_by     uuid references public.profiles (id) on delete set null;

-- Existing rows are already live on the public site; anything else would hide
-- 43,307 reviews the moment this migration runs.
update public.reviews set status = 'published' where status is null;

alter table public.reviews
  alter column status set default 'published',
  alter column status set not null;

comment on column public.reviews.status is
  'Moderation state. The public read policy only exposes ''published''.';
comment on column public.reviews.reviewed_by is
  'Admin who last changed the status. Null for rows never moderated.';

-- ---------------------------------------------------------------------------
-- 2. Indexes.
--
--    Only two additions, both justified by a measurement rather than a guess:
--
--    a) Searching reviewer_name/comments with ILIKE was a sequential scan over
--       43,307 rows — EXPLAIN ANALYZE showed 1047 ms. GIN trigram indexes make
--       the leading-wildcard search the toolbar issues indexable.
--
--    b) The queue's default view is "filter by status, newest first", so a
--       composite on (status, review_date desc) serves both the filter and the
--       ordering from one index.
--
--    property_id, author_user_id and review_date already have indexes from
--    earlier migrations; nothing is duplicated here.
-- ---------------------------------------------------------------------------
create index if not exists idx_reviews_reviewer_name_trgm
  on public.reviews using gin (reviewer_name gin_trgm_ops);

create index if not exists idx_reviews_comments_trgm
  on public.reviews using gin (comments gin_trgm_ops);

create index if not exists idx_reviews_status_date
  on public.reviews (status, review_date desc nulls last);

-- ---------------------------------------------------------------------------
-- 3. RLS — make moderation take effect.
--
--    The public policy previously exposed every row, which would have made
--    "reject" a decision with no consequence. Narrowed to published only.
--    Admins do not read through this policy (the RPCs are SECURITY DEFINER),
--    and an author keeps sight of their own review whatever its state so a
--    rejection is not silently invisible to the person who wrote it.
-- ---------------------------------------------------------------------------
drop policy if exists "catalog: public read reviews" on public.reviews;
create policy "catalog: public read reviews"
  on public.reviews for select
  using (status = 'published');

drop policy if exists "reviews: author reads own" on public.reviews;
create policy "reviews: author reads own"
  on public.reviews for select
  using (author_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. Base view — one definition of "a review row" for the list and the detail.
--
--    A plain view, so it inherits the caller's privileges; the SECURITY DEFINER
--    functions below are what allow an admin to see non-published rows.
-- ---------------------------------------------------------------------------
create or replace view public.admin_reviews_base as
select
  r.id,
  r.status::text                          as status,
  r.rating,
  r.comments,
  r.review_date,
  r.created_at,
  r.moderation_note,
  r.reviewed_at,
  r.source::text                          as source,
  -- A review is either guest-written (author_user_id) or imported
  -- (reviewer_name). Collapse both into one display name so the column is
  -- never blank and the list can sort on it.
  coalesce(
    nullif(btrim(coalesce(pr.full_name, '')), ''),
    nullif(btrim(coalesce(r.reviewer_name, '')), ''),
    'Anonymous'
  )                                       as reviewer_name,
  r.author_user_id                        as reviewer_id,
  pr.email                                as reviewer_email,
  pr.avatar_url                           as reviewer_avatar_url,
  (r.author_user_id is not null)           as reviewer_is_member,
  p.id                                    as property_id,
  p.name                                  as property_name,
  p.city                                  as property_city,
  p.country                               as property_country,
  h.id                                    as host_id,
  h.name                                  as host_name,
  h.is_superhost                          as host_is_superhost,
  mod.full_name                           as reviewed_by_name
from public.reviews r
left join public.properties p on p.id = r.property_id
left join public.hosts      h on h.id = p.host_id
left join public.profiles   pr on pr.id = r.author_user_id
left join public.profiles   mod on mod.id = r.reviewed_by;

comment on view public.admin_reviews_base is
  'Denormalised review row for the admin moderation queue. Read through the '
  'admin_reviews_* SECURITY DEFINER functions, which check is_admin().';

-- ---------------------------------------------------------------------------
-- 5. List — filtered, sorted, counted and paginated entirely in Postgres.
-- ---------------------------------------------------------------------------
create or replace function public.admin_reviews_list(
  p_search    text default null,
  p_status    text default null,
  p_rating    int  default null,
  p_source    text default null,
  p_sort      text default 'review_date',
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
  v_status text    := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_source text    := nullif(lower(btrim(coalesce(p_source, ''))), '');
  v_rating int     := p_rating;
  v_sort   text    := lower(btrim(coalesce(p_sort, 'review_date')));
  v_asc    boolean := lower(btrim(coalesce(p_dir, 'desc'))) = 'asc';
  v_total  int;
  v_rows   json;
begin
  if not public.is_admin() then
    raise exception 'admin_reviews_list: forbidden' using errcode = '42501';
  end if;

  if v_status = 'all' then v_status := null; end if;
  if v_source = 'all' then v_source := null; end if;
  if v_rating is not null and (v_rating < 1 or v_rating > 5) then v_rating := null; end if;
  v_offset := (v_page - 1) * v_size;

  -- Escape LIKE metacharacters so a search for "100%" or "a_b" stays literal
  -- instead of matching everything.
  if v_q is not null then
    v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with filtered as (
    select b.*
      from public.admin_reviews_base b
     where (v_status is null or b.status = v_status)
       and (v_source is null or b.source = v_source)
       and (v_rating is null or b.rating = v_rating)
       and (
         v_q is null
         or b.reviewer_name                     ilike v_q
         or coalesce(b.comments, '')            ilike v_q
         or coalesce(b.property_name, '')       ilike v_q
         or coalesce(b.host_name, '')           ilike v_q
         or coalesce(b.reviewer_email, '')      ilike v_q
       )
  ),
  keyed as (
    select f.*,
           case v_sort
             when 'reviewer_name' then lower(f.reviewer_name)
             when 'property_name' then lower(coalesce(f.property_name, ''))
             when 'host_name'     then lower(coalesce(f.host_name, ''))
             when 'status'        then f.status
             else null
           end as sort_txt,
           case v_sort
             when 'rating'     then f.rating::numeric
             when 'created_at' then extract(epoch from f.created_at)
             else extract(epoch from f.review_date::timestamptz)
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
                  'id',                 o.id,
                  'status',             o.status,
                  'rating',             o.rating,
                  -- Truncated for the list; the detail call returns it whole.
                  'excerpt',            left(coalesce(o.comments, ''), 240),
                  'review_date',        o.review_date,
                  'created_at',         o.created_at,
                  'source',             o.source,
                  'reviewer_name',      o.reviewer_name,
                  'reviewer_id',        o.reviewer_id,
                  'reviewer_avatar_url', o.reviewer_avatar_url,
                  'reviewer_is_member', o.reviewer_is_member,
                  'property_id',        o.property_id,
                  'property_name',      o.property_name,
                  'property_city',      o.property_city,
                  'property_country',   o.property_country,
                  'host_id',            o.host_id,
                  'host_name',          o.host_name
                )
                order by o.rn
              )
         from ordered o
        where o.rn > v_offset
          and o.rn <= v_offset + v_size),
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

revoke all on function public.admin_reviews_list(text, text, int, text, text, text, int, int) from public, anon;
grant execute on function public.admin_reviews_list(text, text, int, text, text, text, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Detail — the full review plus reviewer, property and host context.
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_detail(p_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v json;
begin
  if not public.is_admin() then
    raise exception 'admin_review_detail: forbidden' using errcode = '42501';
  end if;

  select json_build_object(
           'id',              b.id,
           'status',          b.status,
           'rating',          b.rating,
           'comments',        b.comments,
           'review_date',     b.review_date,
           'created_at',      b.created_at,
           'source',          b.source,
           'moderation_note', b.moderation_note,
           'reviewed_at',     b.reviewed_at,
           'reviewed_by_name', b.reviewed_by_name,
           'reviewer', json_build_object(
             'id',         b.reviewer_id,
             'name',       b.reviewer_name,
             'email',      b.reviewer_email,
             'avatar_url', b.reviewer_avatar_url,
             'is_member',  b.reviewer_is_member
           ),
           'property', json_build_object(
             'id',      b.property_id,
             'name',    b.property_name,
             'city',    b.property_city,
             'country', b.property_country
           ),
           'host', json_build_object(
             'id',           b.host_id,
             'name',         b.host_name,
             'is_superhost', b.host_is_superhost
           )
         )
    into v
    from public.admin_reviews_base b
   where b.id = p_id;

  -- Null, not an error: most likely purged by another admin between the list
  -- render and the click, which the panel reports as "no longer exists".
  return v;
end;
$fn$;

revoke all on function public.admin_review_detail(uuid) from public, anon;
grant execute on function public.admin_review_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Moderation — one function for every transition.
--
--    Approve, reject, restore and delete are the same write with a different
--    target state, so they share one entry point rather than four near-identical
--    functions that could drift apart. `restore` is not a state: it is the verb
--    the UI uses, and it resolves to 'published'.
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_set_status(
  p_id     uuid,
  p_status text,
  p_note   text default null
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_status review_status_enum;
  v_admin  uuid := auth.uid();
  v_found  boolean;
begin
  if not public.is_admin() then
    raise exception 'admin_review_set_status: forbidden' using errcode = '42501';
  end if;

  -- Fixed vocabulary, checked here rather than trusted from the caller.
  case lower(btrim(coalesce(p_status, '')))
    when 'published' then v_status := 'published';
    when 'approve'   then v_status := 'published';
    when 'restore'   then v_status := 'published';
    when 'pending'   then v_status := 'pending';
    when 'rejected'  then v_status := 'rejected';
    when 'reject'    then v_status := 'rejected';
    when 'deleted'   then v_status := 'deleted';
    when 'delete'    then v_status := 'deleted';
    else
      raise exception 'admin_review_set_status: unknown status %', p_status
        using errcode = '22023';
  end case;

  update public.reviews
     set status          = v_status,
         -- Keep an existing note when none is supplied, so approving a review
         -- does not erase why it was rejected last week.
         moderation_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), moderation_note),
         reviewed_at     = now(),
         reviewed_by     = v_admin
   where id = p_id;

  v_found := found;
  if not v_found then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;

  return json_build_object('ok', true, 'id', p_id, 'status', v_status::text);
end;
$fn$;

revoke all on function public.admin_review_set_status(uuid, text, text) from public, anon;
grant execute on function public.admin_review_set_status(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Counts per status — drives the queue's filter chips without a second
--    round trip per chip.
-- ---------------------------------------------------------------------------
create or replace function public.admin_reviews_status_counts()
returns json
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v json;
begin
  if not public.is_admin() then
    raise exception 'admin_reviews_status_counts: forbidden' using errcode = '42501';
  end if;

  select json_build_object(
           'all',       count(*)::int,
           'published', count(*) filter (where status = 'published')::int,
           'pending',   count(*) filter (where status = 'pending')::int,
           'rejected',  count(*) filter (where status = 'rejected')::int,
           'deleted',   count(*) filter (where status = 'deleted')::int
         )
    into v
    from public.reviews;

  return v;
end;
$fn$;

revoke all on function public.admin_reviews_status_counts() from public, anon;
grant execute on function public.admin_reviews_status_counts() to authenticated;
