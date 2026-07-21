-- ============================================================================
-- StayLens · Migration 0007 · Vector search (pgvector)
-- ----------------------------------------------------------------------------
-- Semantic search + "more like this" recommendations. Embeddings are produced
-- by OpenAI text-embedding-3-small (1536 dims) — see scripts/generate_embeddings.py.
-- ============================================================================

-- ===========================================================================
-- embeddings — one vector per property (1:1)
-- ===========================================================================
create table if not exists embeddings (
    id           uuid primary key default gen_random_uuid(),
    property_id  uuid not null unique references properties (id) on delete cascade,
    content      text not null,                       -- exact text that was embedded
    content_hash text not null,                       -- md5(content) → skip re-embedding
    embedding    vector(1536) not null,
    model        text not null default 'text-embedding-3-small',
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);
comment on table embeddings is 'Per-property semantic vectors for search & recommendations.';
comment on column embeddings.content_hash is 'md5 of content; lets ETL skip unchanged rows.';

create trigger trg_embeddings_updated
    before update on embeddings
    for each row execute function set_updated_at();

-- HNSW index for fast approximate nearest-neighbour (cosine distance).
-- m / ef_construction tuned for ~5.5k–150k rows.
create index if not exists idx_embeddings_hnsw
    on embeddings using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);

alter table embeddings enable row level security;
create policy "embeddings: public read" on embeddings for select using (true);

-- ===========================================================================
-- match_properties() — semantic search
--   Given a query embedding, return the most similar active properties,
--   with optional price / room-type / capacity filters.
-- ===========================================================================
create or replace function match_properties(
    query_embedding vector(1536),
    match_count     int    default 20,
    similarity_threshold float default 0.0,
    filter_room_type room_type_enum default null,
    max_price       numeric default null,
    min_accommodates int    default null
)
returns table (
    property_id uuid,
    name        text,
    room_type   room_type_enum,
    price       numeric,
    city        text,
    country     text,
    similarity  float
)
language sql stable
as $$
    select
        p.id,
        p.name,
        p.room_type,
        p.price,
        p.city,
        p.country,
        1 - (e.embedding <=> query_embedding) as similarity
    from embeddings e
    join properties p on p.id = e.property_id
    where p.is_active
      and (filter_room_type   is null or p.room_type = filter_room_type)
      and (max_price          is null or p.price <= max_price)
      and (min_accommodates   is null or p.accommodates >= min_accommodates)
      and (1 - (e.embedding <=> query_embedding)) >= similarity_threshold
    order by e.embedding <=> query_embedding
    limit match_count;
$$;
comment on function match_properties is 'Semantic search over property embeddings (cosine).';

-- ===========================================================================
-- similar_properties() — "more like this" recommendations
--   Nearest neighbours of a given property (excludes itself).
-- ===========================================================================
create or replace function similar_properties(
    source_property_id uuid,
    match_count        int default 10
)
returns table (
    property_id uuid,
    name        text,
    price       numeric,
    city        text,
    similarity  float
)
language sql stable
as $$
    with src as (
        select embedding from embeddings where property_id = source_property_id
    )
    select
        p.id, p.name, p.price, p.city,
        1 - (e.embedding <=> (select embedding from src)) as similarity
    from embeddings e
    join properties p on p.id = e.property_id
    where e.property_id <> source_property_id
      and p.is_active
      and exists (select 1 from src)
    order by e.embedding <=> (select embedding from src)
    limit match_count;
$$;
comment on function similar_properties is 'Content-based recommendations via vector similarity.';
