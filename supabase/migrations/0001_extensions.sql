-- ============================================================================
-- StayLens · Migration 0001 · Extensions
-- ----------------------------------------------------------------------------
-- Enables the Postgres extensions the platform depends on. All extensions used
-- here are available on Supabase's managed Postgres.
-- ============================================================================

-- gen_random_uuid(), crypt() etc. (usually pre-installed on Supabase)
create extension if not exists "pgcrypto" with schema extensions;

-- Trigram similarity for fuzzy text search (ILIKE %term%, name matching)
create extension if not exists "pg_trgm" with schema extensions;

-- Accent-insensitive search ("Sao" ~ "São")
create extension if not exists "unaccent" with schema extensions;

-- Geo radius search without PostGIS (ll_to_earth / earth_distance)
create extension if not exists "cube" with schema extensions;
create extension if not exists "earthdistance" with schema extensions;

-- Vector similarity search for embeddings (semantic search / recommendations)
create extension if not exists "vector" with schema extensions;

comment on extension vector is 'pgvector — powers StayLens semantic search & recommendations';
