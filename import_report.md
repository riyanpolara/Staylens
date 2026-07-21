# StayLens — Final Import Report

_Generated 2026-07-01 13:28 UTC by `scripts/verify_import.py` against the live Supabase database._

## Result: ✅ PASS — database fully populated & verified

## Record counts

| Table | Rows | Expected | Status |
|---|---:|---:|---|
| Total properties | 5,555 | 5,555 | ✅ |
| Total hosts | 5,104 | 5,104 | ✅ |
| Total reviews | 149,792 | 149,792 | ✅ |
| Total amenities | 185 | 185 | ✅ |
| Total property images | 5,555 | 5,555 | ✅ |
| Total property_amenities | 120,137 | 120,137 | ✅ |
| Kaggle analytics (secondary) | 102,058 | 102,058 | ✅ |

## Integrity checks

| Check | Count | Status |
|---|---:|---|
| orphan properties.host_id → hosts | 0 | ✅ PASS |
| orphan property_images.property_id → properties | 0 | ✅ PASS |
| orphan reviews.property_id → properties | 0 | ✅ PASS |
| orphan property_amenities.property_id → properties | 0 | ✅ PASS |
| orphan property_amenities.amenity_id → amenities | 0 | ✅ PASS |
| properties with NULL host_id (missing host ref) | 0 | ✅ PASS |
| properties with NO image (missing image ref) | 0 | ✅ PASS |
| duplicate properties.source_id | 0 | ✅ PASS |
| duplicate hosts.source_host_id | 0 | ✅ PASS |
| duplicate amenities.slug | 0 | ✅ PASS |
| duplicate property_amenities PK | 0 | ✅ PASS |
| duplicate reviews.source_review_id | 0 | ✅ PASS |

### What was verified
- **No orphan foreign keys** — every host, property, amenity and review reference resolves.
- **No duplicate primary keys** — source ids, slugs and composite PKs are unique.
- **No missing image references** — every property has ≥1 image; no orphan images.
- **No missing host references** — every property resolves to a host.
