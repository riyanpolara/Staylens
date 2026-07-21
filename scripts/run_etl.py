"""Phase 3/4 — ETL orchestrator.

Runs both dataset cleaners and writes a consolidated `data_quality_report.md`.

Run:  python scripts/run_etl.py
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

import clean_mongo
import clean_kaggle

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT = os.path.join(ROOT, "data_quality_report.md")


def main():
    print("=" * 60)
    print("StayLens ETL")
    print("=" * 60)
    mongo = clean_mongo.run()
    kaggle = clean_kaggle.run()

    c = mongo["counts"]
    lines = []
    a = lines.append
    a("# StayLens — Data Quality Report")
    a("")
    a(f"_Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} by `scripts/run_etl.py`._")
    a("")
    a("## Dataset 1 — MongoDB Sample Airbnb (normalized catalog)")
    a("")
    a("### Row counts (input → output)")
    a("")
    a("| Entity | Rows |")
    a("|---|---:|")
    a(f"| Listings read | {c.get('listings_read', 0):,} |")
    a(f"| **properties** written | {c.get('properties_written', 0):,} |")
    a(f"| **hosts** (deduplicated) | {c.get('hosts_unique', 0):,} |")
    a(f"| **property_images** written | {c.get('images_written', 0):,} |")
    a(f"| **amenities** (deduplicated) | {c.get('amenities_unique', 0):,} |")
    a(f"| **property_amenities** links | {c.get('property_amenities_written', 0):,} |")
    a(f"| **reviews** written | {c.get('reviews_written', 0):,} |")
    a("")
    a(f"- Host rows collapsed from listings via dedup: {c.get('host_dedup_skipped', 0):,} duplicate references skipped.")
    a(f"- FK check — properties → hosts resolvable: {c.get('fk_property_host_ok', 0):,}; "
      f"orphaned host refs: {c.get('fk_orphan_host_refs', 0):,}.")
    a("")
    a("### Data-quality issues (flagged, not silently dropped)")
    a("")
    if mongo["issues"]:
        a("| Issue | Count |")
        a("|---|---:|")
        for k, v in sorted(mongo["issues"].items(), key=lambda x: -x[1]):
            a(f"| `{k}` | {v:,} |")
    else:
        a("_None._")
    a("")
    a("Full per-issue samples: `data/logs/clean_mongo_log.jsonl`.")
    a("")
    a("## Dataset 2 — Kaggle Airbnb Open Data (analytics mart)")
    a("")
    a(f"- Rows in: **{kaggle['rows_in']:,}**")
    a(f"- Rows out: **{kaggle['rows_out']:,}**")
    a(f"- Duplicate rows removed: **{kaggle['duplicates_removed']:,}**")
    a("")
    a("### Data-quality issues")
    a("")
    if kaggle["issues"]:
        a("| Issue | Count |")
        a("|---|---:|")
        for k, v in sorted(kaggle["issues"].items(), key=lambda x: -x[1]):
            a(f"| `{k}` | {v:,} |")
    else:
        a("_None._")
    a("")
    a("Full per-issue samples: `data/logs/clean_kaggle_log.jsonl`.")
    a("")
    a("## Cleaning rules applied")
    a("")
    a("- **Currency** normalized to USD via static FX table (`cleaners.to_usd`).")
    a("- **Money** strings (`$1,056 `) → `NUMERIC`; negatives rejected.")
    a("- **Booleans** (`TRUE/FALSE`, `verified/unconfirmed`, `t/f`) → real booleans.")
    a("- **Percentages** (host response rate) → clamped 0–100 integers.")
    a("- **Dates**: Mongo epoch-ms and Kaggle `M/D/YYYY` → `DATE`.")
    a("- **Amenities** array → deduped dictionary + M:N link rows.")
    a("- **Nested JSON** (host, address, location, images, review_scores) flattened / normalized.")
    a("- **Geo** validated to lat∈[-90,90], lon∈[-180,180]; bad coords nulled.")
    a("- **Sentinels** (int32 max nights, negative nights, availability>365) nulled + logged.")
    a("- **Deterministic UUIDv5** keys → idempotent re-runs & stable FKs.")
    a("")

    with open(REPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\nWrote {REPORT}")


if __name__ == "__main__":
    main()
