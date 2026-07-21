# StayLens — Database Audit Report

_Generated 2026-07-03 against live Supabase project `incjfaggypfmsegyanei`
(Postgres 17.6, region ap-southeast-1). **Read-only audit — no changes were made.**_

---

## 1. Database overview

**15 application tables** (14 in `public`, 1 in `analytics`) + Supabase system schemas.
Database size: **720 MB**.

| Table | Rows | Total size | Heap | Indexes | Dead tuples |
|---|---:|---:|---:|---:|---:|
| public.property_amenities | 2,600,900 | 316 MB | 149 MB | 166 MB | 0 |
| public.properties | 111,577 | 196 MB | 101 MB | 87 MB | 0 |
| public.reviews | 149,792 | 82 MB | 62 MB | 20 MB | 0 |
| analytics.kaggle_listings | 102,058 | 45 MB | 39 MB | 6 MB | 0 |
| public.property_images | 111,577 | 35 MB | 21 MB | 13 MB | 0 |
| public.hosts | 44,621 | 27 MB | 23 MB | 4 MB | 0 |
| public.amenities | 13,143 | 4.7 MB | 1.8 MB | 2.8 MB | 0 |
| public.embeddings | 0 | 2.6 MB | 0 | 2.5 MB | 0 |
| public.cities | 22 | 112 kB | 16 kB | 64 kB | 22 |
| public.profiles / favorites / bookmarks / chat_sessions / chat_messages / bookings | 0 each | ≤32 kB | — | — | 0 |

### Keys & constraints (all present and enforced)

| Table | PK | FKs | Unique | Check / Exclusion |
|---|---|---|---|---|
| cities | id | — | (lower(city_name), lower(country)) | — |
| profiles | id | → auth.users | username | username_len |
| hosts | id | — | (source, source_host_id) | response/acceptance rate 0–100 |
| properties | id | → hosts (SET NULL), → cities (SET NULL) | (source, source_id) | price≥0, lat/lon ranges, max≥min nights, rating 0–100, accommodates≥0 |
| property_images | id | → properties (CASCADE) | one primary per property (partial) | image_type domain |
| amenities | id | — | name, slug | — |
| property_amenities | (property_id, amenity_id) | → properties, → amenities (CASCADE) | — | — |
| reviews | id | → properties (CASCADE), → profiles (SET NULL) | (source, source_review_id) | — |
| favorites / bookmarks | id | → profiles, → properties (CASCADE) | per-user-per-property (+collection) | — |
| chat_sessions / chat_messages | id | → profiles / → chat_sessions (CASCADE) | — | role domain |
| bookings | id | → properties, → profiles (RESTRICT) | — | dates valid, guests>0, **no-overlap EXCLUDE (gist)** |
| embeddings | id | → properties (CASCADE) | property_id | — |
| analytics.kaggle_listings | id (bigint) | — | — | — |

### Indexes — 54 total. Largest:

| Index | Table | Size |
|---|---|---:|
| property_amenities_pkey | property_amenities | **166 MB** |
| idx_properties_fts (GIN full-text) | properties | 29 MB |
| idx_properties_name_trgm (GIN trigram) | properties | 20 MB |
| idx_properties_geo (GiST earthdistance) | properties | 12 MB |
| properties_source_uk | properties | 7.7 MB |
| reviews_source_uk / reviews_pkey / idx_reviews_reviewer | reviews | ~6 MB each |
| idx_embeddings_hnsw (HNSW, cosine) | embeddings | 2.4 MB (empty table) |

> ⚠️ **Missing index:** `idx_prop_amen_amenity` (reverse amenity → property lookup)
> was intentionally dropped during the free-tier bulk load. Amenity-filter queries
> ("all properties with Wifi") currently sequential-scan 2.6M rows.

---

## 2. Data analysis

### Integrity (exact checks, all PASS)

| Check | Count |
|---|---:|
| Duplicate PKs / natural keys (7 checks: properties, hosts, amenities, reviews, links, cities, kaggle) | **0** |
| Orphan FKs (6 checks: host_id, city_id, images, reviews, links×2) | **0** |
| Properties without an image | **0** |

### Data-quality findings (non-blocking)

| Finding | Count | Explanation |
|---|---:|---|
| Properties without `city_id` | 6 | Source rows have no city at all (NULL city in MongoDB data) |
| Properties without any amenity link | 223 | IA listings outside the loaded top-50 amenity set, or none listed |
| Properties with NULL price | 14,901 (13.4%) | Inside Airbnb listings scraped without a price |
| Properties with no description or summary | 3,439 (3.1%) | Thin source records — affects embedding quality |
| "(untitled)" placeholder names | 11 | ETL default for blank names |
| Reviews with NULL comments | 162 (0.1%) | Empty comments in source |
| `amenities.category` NULL | 99.5% | Only the original 185 Mongo-era amenities were categorized; 12,958 IA amenities uncategorized |
| Pseudo-cities "Other (International/Domestic)" | 4 city rows, 5 properties | Airbnb market placeholders, not real cities |
| Hong Kong split across 2 city rows | (HK\|Hong Kong) 600 + (HK\|China) 19 | Country-attribution inconsistency in source |

### Notable null percentages (properties, 111,577 rows)

Mongo-only fields are ~95% NULL because IA doesn't carry them (expected, not corruption):
`monthly/weekly_price` 99%+, `notes/interaction/access/transit/house_rules` ~97%,
`security_deposit/cleaning_fee` ~96%, `bed_type/cancellation_policy/street` 95%.
Meaningful gaps: `review_scores_*` ~25% (unreviewed listings), `beds` 18%, `price` 13.4%,
`bedrooms` 5.8%, `description` 2.9%. Hosts: `acceptance_rate` 44%, `response_time/rate` ~40%.
`property_images.caption/width/height` and `reviews.author_user_id` are 100% NULL (future-use columns).

---

## 3. Current datasets

Three datasets imported; a fourth (Kaggle) isolated in `analytics`. **No cross-dataset
record merging** (only city-dimension sharing).

| Entity | MongoDB Sample Airbnb | Inside Airbnb (6 cities) | Kaggle Open Data |
|---|---:|---:|---:|
| Properties | 5,555 | 106,022 | 102,058 (analytics only) |
| Hosts | 5,104 | 39,517 | (not normalized) |
| Reviews | 149,792 | **0 — skipped (free-tier disk)** | (not normalized) |
| Amenity links | 120,137 | 2,480,763 (top-50 amenities) | — |
| Distinct amenities used | 185 | 50 (of 13,058 in dictionary) | — |
| Images | 5,555 | 106,022 | — |
| Calendar records | — | **0 — not imported** (no table; CSVs on disk, ~1.3 GB) | — |

Deferred source data ready on disk: `data/clean/insideairbnb/reviews.csv` (4,363,757 rows),
remaining 1.0M amenity links, calendar CSVs (never ETL'd — no schema table).

---

## 4. Location analysis

**22 cities · 12 countries · 6 continents.** All 22 have centroids, currency, and continent;
21/22 have timezone (missing: "Other (Domestic)").

| City | State | Country | Continent | Properties |
|---|---|---|---|---:|
| Hawaii | Hawaii | United States | North America | 33,457 |
| Bangkok | Central Thailand | Thailand | Asia | 28,806 |
| Barcelona | Catalonia | Spain | Europe | 16,739 |
| Berlin | Berlin | Germany | Europe | 14,274 |
| Austin | Texas | United States | North America | 10,533 |
| Bristol | England | United Kingdom | Europe | 2,845 |
| Istanbul | — | Turkey | Asia | 660 |
| Montreal | — | Canada | North America | 648 |
| Sydney | — | Australia | Oceania | 609 |
| New York | New York | United States | North America | 607 |
| Rio De Janeiro | — | Brazil | South America | 603 |
| Hong Kong | — | Hong Kong | Asia | 600 |
| Porto | — | Portugal | Europe | 554 |
| Oahu | — | United States | North America | 253 |
| Maui | — | United States | North America | 153 |
| The Big Island | — | United States | North America | 139 |
| Kauai | — | United States | North America | 67 |
| Hong Kong | — | China | Asia | 19 |
| Other (International) | — | Brazil / Turkey / Portugal | — | 4 |
| Other (Domestic) | — | United States | — | 1 |

Countries: United States, Thailand, Spain, Germany, United Kingdom, Turkey, Canada,
Australia, Brazil, Hong Kong, China, Portugal.

---

## 5. Semantic search

| Component | Status |
|---|---|
| `vector` extension | ✅ installed, **v0.8.0** |
| `embeddings` table | ✅ exists (vector(1536), content_hash for incremental refresh) |
| Embeddings stored | ⚠️ **0** — generation blocked on missing `OPENAI_API_KEY` |
| HNSW index | ✅ `idx_embeddings_hnsw` (cosine, m=16, ef_construction=64) |
| Search functions | ✅ `match_properties()` (filtered semantic search), `similar_properties()` (recommendations) — both verified working with test vectors post-migration |

---

## 6. Storage

- **Database: 720 MB** — ⚠️ above the free-tier 500 MB quota (project risks read-only
  enforcement by Supabase; the disk itself is ~1 GB and DiskFull was already hit during import).
- Largest consumers: `property_amenities` 316 MB (its composite-UUID PK index alone is 166 MB),
  `properties` 196 MB (87 MB of which is FTS + trigram + geo indexes), `reviews` 82 MB.

**Storage by dataset (estimated from row shares + measured heap):**

| Dataset | Estimated footprint |
|---|---:|
| Inside Airbnb (props 86 MB heap + links ~300 MB + images/hosts) | ~450 MB (≈63%) |
| MongoDB Sample Airbnb (props 15 MB heap + 150k reviews 82 MB + links) | ~140 MB (≈19%) |
| Kaggle Open Data (analytics) | 45 MB (≈6%) |
| Indexes on shared/empty tables, catalog, WAL headroom | remainder |

---

## 7. Recommendations

### Schema normalization
1. **Finish the cities cut-over**: once the frontend reads `city_id`, drop
   `properties.city`, `market`, and `country`/`country_code` (a later migration) —
   saves ~8–10 MB and removes drift risk between text columns and the FK.
2. **Merge the Hong Kong split** (`Hong Kong|Hong Kong` + `Hong Kong|China`) via a
   city alias/merge policy, and decide whether the "Other (…)" placeholder cities
   should be real rows or `city_id = NULL`.
3. **Split rarely-populated Mongo-only text columns** (`notes, transit, access,
   interaction, house_rules, space` — all ~96% NULL) into a `property_details`
   1:1 side-table if the properties row width becomes a scan bottleneck. Optional;
   not urgent at current scale.
4. `hosts` vs `profiles` remain correctly separated; bookings/chat schemas are ready but empty.

### Cities table
5. Backfill `cities.state` for the 15 Mongo-era cities (68% NULL) — a 15-row UPDATE.
6. Add the missing timezone for the one placeholder city, or exclude placeholders.

### Indexes
7. **Recreate `idx_prop_amen_amenity`** (`on property_amenities (amenity_id)`) as soon
   as disk allows — amenity filtering currently seq-scans 2.6M rows. (~85 MB.)
8. Consider a **covering composite** `(amenity_id, property_id)` instead of a plain
   amenity index — enables index-only scans for the amenity-filter path at the same cost.
9. `idx_reviews_reviewer` (5.7 MB) is speculative — no current query path uses reviewer
   lookups; drop if space stays tight.
10. Audit unused-index stats after the app goes live (`pg_stat_user_indexes.idx_scan`).

### Storage optimization
11. **The project has outgrown the free tier** (720 MB used, quota 500 MB). Upgrade to
    Pro (8 GB) to: load the 4.36M deferred IA reviews, restore the remaining 1.0M amenity
    links, recreate index (7), and leave headroom for embeddings. Without upgrading,
    expect Supabase to enforce read-only mode.
12. If staying free short-term: `analytics.kaggle_listings` (45 MB) is the only
    non-essential large object — archivable to CSV; and VACUUM FULL on `cities` clears
    its 22 dead tuples (cosmetic).

### Semantic search optimization
13. **Embeddings don't fit the free tier at current settings**: 111,577 × vector(1536)
    ≈ 700 MB + a comparable HNSW index. Before generating, either upgrade the plan, or:
    - use **`halfvec(1536)`** (pgvector 0.8 supports it) → ~½ the storage with negligible
      recall loss, and/or
    - request **512-dim** embeddings from `text-embedding-3-small` (`dimensions: 512`)
      → ~⅓ the storage; 512-dim + halfvec ≈ 120–150 MB total — still tight but feasible
      only after freeing space.
14. Generate embeddings incrementally with the existing
    `generate_embeddings.py --source inside_airbnb` (content-hash skips unchanged rows).
15. Once embeddings exist at 100k+ scale, set `hnsw.ef_search` per query (40–100) to tune
    the recall/latency trade-off, and keep the current `m=16, ef_construction=64` build
    parameters (appropriate for this cardinality).
16. 3,439 properties lack description/summary — their embedding text will be thin
    (name + city + amenities only). Consider enriching from reviews once IA reviews load.
