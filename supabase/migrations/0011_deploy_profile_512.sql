-- ============================================================================
-- StayLens · Migration 0011 · Free-tier deployment profile
-- ----------------------------------------------------------------------------
-- 1. Embeddings switch to 512-dim vectors (text-embedding-3-small with
--    dimensions=512) — ~3× smaller storage than 1536-dim, appropriate for the
--    free-tier deployment. Table is empty at migration time, so the type
--    change is instant and lossless.
-- 2. match_properties() re-created for vector(512) (similar_properties is
--    dimension-agnostic and unchanged).
-- 3. Restores the amenity reverse-lookup index (dropped during the bulk load)
--    as a covering composite — enables index-only scans for amenity filters.
-- ============================================================================

-- ---- 1. 512-dim embeddings -------------------------------------------------
alter table embeddings alter column embedding type vector(512);
comment on column embeddings.embedding is
    'text-embedding-3-small @ dimensions=512 (free-tier deployment profile)';

-- HNSW index survives the type change only if empty; recreate defensively.
drop index if exists idx_embeddings_hnsw;
create index idx_embeddings_hnsw
    on embeddings using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);

-- ---- 2. match_properties for vector(512) ----------------------------------
drop function if exists match_properties(vector, int, float, room_type_enum, numeric, int);
create or replace function match_properties(
    query_embedding vector(512),
    match_count     int    default 20,
    similarity_threshold float default 0.0,
    filter_room_type room_type_enum default null,
    max_price       numeric default null,
    min_accommodates int    default null
)
returns table (
    property_id uuid, name text, room_type room_type_enum,
    price numeric, city text, country text, similarity float
)
language sql stable as $$
    select p.id, p.name, p.room_type, p.price, p.city, p.country,
           1 - (e.embedding <=> query_embedding) as similarity
    from embeddings e
    join properties p on p.id = e.property_id
    where p.is_active
      and (filter_room_type is null or p.room_type = filter_room_type)
      and (max_price is null or p.price <= max_price)
      and (min_accommodates is null or p.accommodates >= min_accommodates)
      and (1 - (e.embedding <=> query_embedding)) >= similarity_threshold
    order by e.embedding <=> query_embedding
    limit match_count;
$$;
alter function match_properties(vector, int, float, room_type_enum, numeric, int)
    set search_path = public, extensions;
comment on function match_properties is 'Semantic search over 512-dim property embeddings (cosine).';

-- ---- 3. amenity reverse-lookup (covering composite) ------------------------
create index if not exists idx_prop_amen_amenity
    on property_amenities (amenity_id, property_id);
