# StayLens — Database Guide

Postgres 17 on Supabase (project `incjfaggypfmsegyanei`, region `ap-southeast-1`).

## Migrations

Nine idempotent migrations under `supabase/migrations/`, applied in order:

| # | File | Builds |
|---|---|---|
| 0001 | extensions | pgcrypto, pg_trgm, unaccent, cube, earthdistance, vector, btree_gist |
| 0002 | core_schema | enums, `set_updated_at`, `handle_new_user`; profiles, hosts, properties |
| 0003 | property_related | property_images, amenities, property_amenities, reviews |
| 0004 | engagement | favorites, bookmarks, chat_sessions, chat_messages, bookings |
| 0005 | indexes | FK / facet / price / geo(GiST) / trigram / FTS(GIN) |
| 0006 | rls_policies | RLS on all tables + public-read / owner-write policies |
| 0007 | vector_search | embeddings, HNSW index, match_properties, similar_properties |
| 0008 | analytics_kaggle | `analytics` schema + kaggle_listings |
| 0009 | hardening | pin function search_path; revoke RPC on internal functions |
| 0010 | cities | `cities` dimension, `properties.city_id` FK, `inside_airbnb` enum value (non-destructive) |

**Apply** (choose one):

```bash
# A) Supabase CLI
supabase link --project-ref incjfaggypfmsegyanei
supabase db push

# B) psql (in order)
for f in supabase/migrations/0*.sql; do psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f"; done

# C) Supabase MCP (already applied in this project via apply_migration)
```

> The live project already has all nine migrations applied and a 4-property
> validation sample loaded (see "Current state" below).

**Rollback:** `psql "$SUPABASE_DB_URL" -f supabase/migrations/rollback/rollback_all.sql`
(drops all StayLens objects; leaves extensions installed).

## Import the full dataset

Two equivalent paths — both do a **full refresh** (TRUNCATE + load in FK-safe order).

```bash
# Prereqs: run the ETL first so data/clean/*.csv exist
python scripts/run_etl.py

# Option 1 — Python (psycopg2 COPY, recommended)
export SUPABASE_DB_URL="postgresql://postgres.<ref>:<pwd>@...pooler.supabase.com:5432/postgres"
python scripts/import_to_supabase.py

# Option 2 — pure psql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f sql/import.sql
```

Expected row counts after import:

| Table | Rows |
|---|---:|
| properties | 5,555 |
| hosts | 5,104 |
| amenities | 185 |
| property_images | 5,555 |
| property_amenities | 120,137 |
| reviews | 149,792 |
| analytics.kaggle_listings | 102,058 |

**Verify:** `psql "$SUPABASE_DB_URL" -f sql/verification.sql` (10 checks: counts,
referential integrity, constraints, distributions, FTS, geo, reviews, embeddings).

## Generate embeddings (semantic search)

```bash
export OPENAI_API_KEY=sk-...
export SUPABASE_DB_URL=postgresql://...
python scripts/generate_embeddings.py         # ~5,555 vectors, incremental via content_hash
```

## Query examples

```sql
-- Semantic search (app passes a 1536-d query embedding from OpenAI)
select * from match_properties($1::vector, match_count => 20, max_price => 150);

-- "More like this"
select * from similar_properties('<property-uuid>', 10);

-- Keyword search (no embedding needed)
select id, name from properties
where to_tsvector('english', name||' '||coalesce(description,''))
      @@ websearch_to_tsquery('english', 'quiet apartment near beach');

-- Geo radius: within 2km of a point
select name from properties
where extensions.earth_box(extensions.ll_to_earth(41.1413,-8.6131), 2000)
      @> extensions.ll_to_earth(latitude, longitude);
```

## Security

- **RLS** is enabled on every table. Catalog tables are public-read; user tables
  (favorites, bookmarks, chat, bookings) are owner-scoped via `auth.uid()`.
- The ETL/import runs as `service_role`, which **bypasses RLS**.
- An `rls_auto_enable` event trigger (pre-existing in the project) auto-enables
  RLS on any newly created table — belt-and-suspenders.
- Run `get_advisors` (security + performance) after any schema change.

## Current state (as of this build)

- All 9 migrations applied; schema + functions live and validated.
- A **4-property validation sample** (Porto, Rio, Honolulu, Bushwick) with hosts,
  images, 54 amenities, 21 links, 3 reviews is loaded — used to prove FTS, geo,
  amenity joins, and both vector functions work end to end.
- `embeddings` is empty (demo vectors were removed). Running the full import
  replaces the sample; running `generate_embeddings.py` populates vectors.
