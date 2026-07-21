"""Post-import verification & report for StayLens.

Runs record-count, foreign-key, duplicate-key and reference-integrity checks
against the live Supabase database and writes `import_report.md`.

    set SUPABASE_DB_URL=postgresql://...     (or put it in .env)
    python scripts/verify_import.py

Exit code 0 = all checks passed, 1 = one or more failed.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT = os.path.join(ROOT, "import_report.md")

EXPECTED = {
    "properties": 5555,
    "hosts": 5104,
    "amenities": 185,
    "property_images": 5555,
    "property_amenities": 120137,
    "reviews": 149792,
    "analytics.kaggle_listings": 102058,
}


def load_dotenv():
    path = os.path.join(ROOT, ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def scalar(cur, sql):
    cur.execute(sql)
    return cur.fetchone()[0]


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows console is cp1252 by default
    except Exception:
        pass
    load_dotenv()
    dsn = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    if not dsn:
        print("ERROR: set SUPABASE_DB_URL (or put it in .env).", file=sys.stderr)
        return 2
    try:
        import psycopg2
    except ImportError:
        print("ERROR: pip install psycopg2-binary", file=sys.stderr)
        return 2

    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    # ---- 1. record counts ----
    counts = {t: scalar(cur, f"select count(*) from {t}") for t in EXPECTED}

    # ---- 2/5. integrity checks (each must be 0) ----
    checks = {
        "orphan properties.host_id → hosts":
            "select count(*) from properties p left join hosts h on h.id=p.host_id "
            "where p.host_id is not null and h.id is null",
        "orphan property_images.property_id → properties":
            "select count(*) from property_images i left join properties p on p.id=i.property_id "
            "where p.id is null",
        "orphan reviews.property_id → properties":
            "select count(*) from reviews r left join properties p on p.id=r.property_id "
            "where p.id is null",
        "orphan property_amenities.property_id → properties":
            "select count(*) from property_amenities pa left join properties p on p.id=pa.property_id "
            "where p.id is null",
        "orphan property_amenities.amenity_id → amenities":
            "select count(*) from property_amenities pa left join amenities a on a.id=pa.amenity_id "
            "where a.id is null",
        "properties with NULL host_id (missing host ref)":
            "select count(*) from properties where host_id is null",
        "properties with NO image (missing image ref)":
            "select count(*) from properties p where not exists "
            "(select 1 from property_images i where i.property_id=p.id)",
        "duplicate properties.source_id":
            "select count(*) from (select source, source_id from properties "
            "group by source, source_id having count(*)>1) d",
        "duplicate hosts.source_host_id":
            "select count(*) from (select source, source_host_id from hosts "
            "group by source, source_host_id having count(*)>1) d",
        "duplicate amenities.slug":
            "select count(*) from (select slug from amenities group by slug having count(*)>1) d",
        "duplicate property_amenities PK":
            "select count(*) from (select property_id, amenity_id from property_amenities "
            "group by property_id, amenity_id having count(*)>1) d",
        "duplicate reviews.source_review_id":
            "select count(*) from (select source, source_review_id from reviews "
            "where source_review_id is not null group by source, source_review_id having count(*)>1) d",
    }
    results = {name: scalar(cur, sql) for name, sql in checks.items()}
    cur.close(); conn.close()

    # ---- evaluate ----
    count_ok = all(counts[t] == EXPECTED[t] for t in EXPECTED)
    integ_ok = all(v == 0 for v in results.values())
    all_ok = count_ok and integ_ok

    # ---- console ----
    print("Record counts:")
    for t in EXPECTED:
        flag = "OK" if counts[t] == EXPECTED[t] else f"MISMATCH (expected {EXPECTED[t]:,})"
        print(f"  {t:28} {counts[t]:>10,}  {flag}")
    print("Integrity checks (want 0):")
    for name, v in results.items():
        print(f"  [{'PASS' if v == 0 else 'FAIL'}] {name}: {v}")
    print(f"\nOVERALL: {'PASS' if all_ok else 'FAIL'}")

    # ---- report ----
    L = []
    a = L.append
    a("# StayLens — Final Import Report")
    a("")
    a(f"_Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} by "
      f"`scripts/verify_import.py` against the live Supabase database._")
    a("")
    a(f"## Result: {'✅ PASS — database fully populated & verified' if all_ok else '❌ FAIL — see checks below'}")
    a("")
    a("## Record counts")
    a("")
    a("| Table | Rows | Expected | Status |")
    a("|---|---:|---:|---|")
    labels = {
        "properties": "Total properties", "hosts": "Total hosts",
        "reviews": "Total reviews", "amenities": "Total amenities",
        "property_images": "Total property images",
        "property_amenities": "Total property_amenities",
        "analytics.kaggle_listings": "Kaggle analytics (secondary)",
    }
    for t in ["properties", "hosts", "reviews", "amenities", "property_images",
              "property_amenities", "analytics.kaggle_listings"]:
        ok = counts[t] == EXPECTED[t]
        a(f"| {labels[t]} | {counts[t]:,} | {EXPECTED[t]:,} | {'✅' if ok else '❌'} |")
    a("")
    a("## Integrity checks")
    a("")
    a("| Check | Count | Status |")
    a("|---|---:|---|")
    for name, v in results.items():
        a(f"| {name} | {v} | {'✅ PASS' if v == 0 else '❌ FAIL'} |")
    a("")
    a("### What was verified")
    a("- **No orphan foreign keys** — every host, property, amenity and review "
      "reference resolves.")
    a("- **No duplicate primary keys** — source ids, slugs and composite PKs are unique.")
    a("- **No missing image references** — every property has ≥1 image; no orphan images.")
    a("- **No missing host references** — every property resolves to a host.")
    a("")
    with open(REPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    print(f"\nWrote {REPORT}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
