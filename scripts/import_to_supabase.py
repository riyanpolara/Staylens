"""Phase 5 — Bulk import the clean CSVs into Supabase Postgres.

Uses server-side COPY (via psycopg2 copy_expert) which is the fastest way to
load the ~280k rows. Tables are loaded in FK-safe order and TRUNCATEd first so
the load is a clean, repeatable full-refresh.

Prerequisites
-------------
    pip install psycopg2-binary
    set SUPABASE_DB_URL to your project's connection string, e.g.
        postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
    (Supabase Dashboard → Project Settings → Database → Connection string → URI)

Run
---
    python scripts/import_to_supabase.py            # full refresh
    python scripts/import_to_supabase.py --no-truncate
"""
from __future__ import annotations

import argparse
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLEAN_DIR = os.path.join(ROOT, "data", "clean")


def load_dotenv():
    """Minimal .env loader (no dependency): KEY=VALUE lines into os.environ."""
    path = os.path.join(ROOT, ".env")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

# (table, csv file, column list) — FK-safe order.
PLAN = [
    ("amenities", "amenities.csv",
     "id,name,slug,category"),
    ("hosts", "hosts.csv",
     "id,source,source_host_id,name,location,about,response_time,response_rate,"
     "thumbnail_url,picture_url,neighbourhood,is_superhost,has_profile_pic,"
     "identity_verified,listings_count,total_listings_count,verifications"),
    ("properties", "properties.csv", None),      # None → all columns in header order
    ("property_images", "property_images.csv",
     "id,property_id,url,image_type,sort_order,is_primary"),
    ("property_amenities", "property_amenities.csv",
     "property_id,amenity_id"),
    ("reviews", "reviews.csv",
     "id,property_id,source,source_review_id,reviewer_source_id,reviewer_name,"
     "review_date,comments"),
    ("analytics.kaggle_listings", "kaggle_listings.csv", None),
]

# TRUNCATE order (reverse of load); analytics is independent.
TRUNCATE_ORDER = [
    "reviews", "property_amenities", "property_images", "properties",
    "hosts", "amenities", "analytics.kaggle_listings",
]


def header_columns(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.readline().strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-truncate", action="store_true",
                    help="append instead of full refresh")
    args = ap.parse_args()

    load_dotenv()
    dsn = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    if not dsn:
        print("ERROR: set SUPABASE_DB_URL (or DATABASE_URL) to your Postgres URI.",
              file=sys.stderr)
        return 2
    try:
        import psycopg2
    except ImportError:
        print("ERROR: pip install psycopg2-binary", file=sys.stderr)
        return 2

    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        if not args.no_truncate:
            print("Truncating target tables …")
            # CASCADE also clears embeddings/favorites/bookmarks/bookings that FK
            # to properties. Loading below happens in FK-safe order, so no need to
            # disable triggers (which would require superuser on Supabase).
            cur.execute("TRUNCATE TABLE " + ", ".join(TRUNCATE_ORDER) + " CASCADE;")

        for table, fname, cols in PLAN:
            path = os.path.join(CLEAN_DIR, fname)
            if not os.path.exists(path):
                print(f"  ! skip {table}: {fname} not found")
                continue
            collist = cols or header_columns(path)
            sql = (f"COPY {table} ({collist}) FROM STDIN "
                   f"WITH (FORMAT csv, HEADER true, NULL '')")
            with open(path, "r", encoding="utf-8") as f:
                cur.copy_expert(sql, f)
            cur.execute(f"SELECT count(*) FROM {table};")
            print(f"  loaded {table:28} {cur.fetchone()[0]:>10,} rows")

        cur.execute("ANALYZE;")
        conn.commit()
        print("\nCommit OK. Now run: python scripts/verify_import.py")
        return 0
    except Exception as exc:  # noqa: BLE001
        conn.rollback()
        print(f"\nImport failed, rolled back: {exc}", file=sys.stderr)
        return 1
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
