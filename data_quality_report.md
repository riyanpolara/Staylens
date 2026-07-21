# StayLens — Data Quality Report

_Generated 2026-07-01 12:19 UTC by `scripts/run_etl.py`._

## Dataset 1 — MongoDB Sample Airbnb (normalized catalog)

### Row counts (input → output)

| Entity | Rows |
|---|---:|
| Listings read | 5,555 |
| **properties** written | 5,555 |
| **hosts** (deduplicated) | 5,104 |
| **property_images** written | 5,555 |
| **amenities** (deduplicated) | 185 |
| **property_amenities** links | 120,137 |
| **reviews** written | 149,792 |

- Host rows collapsed from listings via dedup: 451 duplicate references skipped.
- FK check — properties → hosts resolvable: 5,555; orphaned host refs: 0.

### Data-quality issues (flagged, not silently dropped)

| Issue | Count |
|---|---:|
| `duplicate_amenity_in_listing` | 1,235 |
| `maximum_nights_capped` | 5 |

Full per-issue samples: `data/logs/clean_mongo_log.jsonl`.

## Dataset 2 — Kaggle Airbnb Open Data (analytics mart)

- Rows in: **102,599**
- Rows out: **102,058**
- Duplicate rows removed: **541**

### Data-quality issues

| Issue | Count |
|---|---:|
| `availability_out_of_range` | 3,185 |
| `house_rules_excel_error` | 2,696 |
| `negative_min_nights` | 13 |

Full per-issue samples: `data/logs/clean_kaggle_log.jsonl`.

## Cleaning rules applied

- **Currency** normalized to USD via static FX table (`cleaners.to_usd`).
- **Money** strings (`$1,056 `) → `NUMERIC`; negatives rejected.
- **Booleans** (`TRUE/FALSE`, `verified/unconfirmed`, `t/f`) → real booleans.
- **Percentages** (host response rate) → clamped 0–100 integers.
- **Dates**: Mongo epoch-ms and Kaggle `M/D/YYYY` → `DATE`.
- **Amenities** array → deduped dictionary + M:N link rows.
- **Nested JSON** (host, address, location, images, review_scores) flattened / normalized.
- **Geo** validated to lat∈[-90,90], lon∈[-180,180]; bad coords nulled.
- **Sentinels** (int32 max nights, negative nights, availability>365) nulled + logged.
- **Deterministic UUIDv5** keys → idempotent re-runs & stable FKs.
