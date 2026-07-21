# StayLens — Cities Migration & Inside Airbnb Import Report

_Generated 2026-07-02 10:20 UTC by `scripts/verify_migration.py` against the live Supabase database._

## Result: ✅ PASS

## Final row counts (all tables)

| Table | Rows |
|---|---:|
| cities | 22 |
| hosts | 44,621 |
| properties | 111,577 |
| amenities | 13,143 |
| property_amenities | 2,600,900 |
| property_images | 111,577 |
| reviews | 149,792 |
| embeddings | 0 |
| analytics.kaggle_listings | 102,058 |

### Properties by source

| Source | Properties |
|---|---:|
| inside_airbnb | 106,022 |
| mongodb_airbnb | 5,555 |

### Reviews by source

| Source | Reviews |
|---|---:|
| mongodb_airbnb | 149,792 |

### city_id coverage (backfill result)

| Source | Properties | With city | Missing city_id |
|---|---:|---:|---:|
| mongodb_airbnb | 5,555 | 5,549 | 6 |
| inside_airbnb | 106,022 | 106,022 | 0 |

## Integrity checks

| Check | Count | Status |
|---|---:|---|
| orphan properties.host_id -> hosts | 0 | ✅ PASS |
| orphan properties.city_id -> cities | 0 | ✅ PASS |
| orphan property_images.property_id -> properties | 0 | ✅ PASS |
| orphan reviews.property_id -> properties | 0 | ✅ PASS |
| orphan property_amenities.property_id -> properties | 0 | ✅ PASS |
| orphan property_amenities.amenity_id -> amenities | 0 | ✅ PASS |
| duplicate properties (source, source_id) | 0 | ✅ PASS |
| duplicate hosts (source, source_host_id) | 0 | ✅ PASS |
| duplicate amenities.slug | 0 | ✅ PASS |
| duplicate reviews (source, source_review_id) | 0 | ✅ PASS |
| duplicate property_amenities PK | 0 | ✅ PASS |
| duplicate cities (name, country) | 0 | ✅ PASS |

## Semantic search (pgvector) after migration

- `match_properties` returned **10** rows (top similarity **1.0**) against newly-imported Inside Airbnb properties.
- `similar_properties` returned **10** rows.
- (Temporary deterministic demo vectors were used to exercise the HNSW index, then removed. Real vectors: run `generate_embeddings.py --source inside_airbnb` with `OPENAI_API_KEY` set.)

## Top cities by property count

| City | State | Country | Continent | Currency | Timezone | Sources | Properties |
|---|---|---|---|---|---|---|---:|
| Hawaii | Hawaii | United States | North America | USD | Pacific/Honolulu | inside_airbnb | 33,457 |
| Bangkok | Central Thailand | Thailand | Asia | THB | Asia/Bangkok | inside_airbnb | 28,806 |
| Barcelona | Catalonia | Spain | Europe | EUR | Europe/Madrid | inside_airbnb,mongodb_airbnb | 16,739 |
| Berlin | Berlin | Germany | Europe | EUR | Europe/Berlin | inside_airbnb | 14,274 |
| Austin | Texas | United States | North America | USD | America/Chicago | inside_airbnb | 10,533 |
| Bristol | England | United Kingdom | Europe | GBP | Europe/London | inside_airbnb | 2,845 |
| Istanbul | - | Turkey | Asia | TRY | Europe/Istanbul | mongodb_airbnb | 660 |
| Montreal | - | Canada | North America | CAD | America/Toronto | mongodb_airbnb | 648 |
| Sydney | - | Australia | Oceania | AUD | Australia/Sydney | mongodb_airbnb | 609 |
| New York | New York | United States | North America | USD | America/New_York | kaggle_open_data,mongodb_airbnb | 607 |
| Rio De Janeiro | - | Brazil | South America | BRL | America/Sao_Paulo | mongodb_airbnb | 603 |
| Hong Kong | - | Hong Kong | Asia | HKD | Asia/Hong_Kong | mongodb_airbnb | 600 |
| Porto | - | Portugal | Europe | EUR | Europe/Lisbon | mongodb_airbnb | 554 |
| Oahu | - | United States | North America | USD | Pacific/Honolulu | mongodb_airbnb | 253 |
| Maui | - | United States | North America | USD | Pacific/Honolulu | mongodb_airbnb | 153 |

## Notes
- Migration was **non-destructive**: no tables dropped/recreated; `city`/`country` columns retained alongside the new `city_id`.
- Kaggle Open Data remains isolated in the `analytics` schema (not merged).
- **Scope decisions (Supabase Free tier, ~1 GB disk incl. WAL):**
  - Inside Airbnb *reviews* (4,363,757 rows, ~3–4 GB) **skipped** — cannot fit. Clean CSV retained at `data/clean/insideairbnb/reviews.csv` for post-upgrade load. MongoDB's 149,792 reviews remain fully loaded.
  - Inside Airbnb *amenity links* trimmed to the **top-50 most common amenities** (2,480,763 of 3,491,895 links, 71%) — full set does not fit. Full CSV retained at `data/clean/insideairbnb/property_amenities.csv`.
  - Secondary index `idx_prop_amen_amenity` (reverse amenity→property lookup) dropped to save ~100 MB; recreate after a plan upgrade: `create index idx_prop_amen_amenity on property_amenities (amenity_id);`
  - Bulk-load used temporary FK drop + `NOT VALID`/`VALIDATE` re-add; both FKs are **re-validated** (full referential integrity enforced).
