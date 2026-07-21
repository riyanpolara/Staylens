"""Load the free-tier DEPLOYMENT dataset into Supabase (full refresh).

TRUNCATEs the catalog (+ analytics mart, excluded from the deployment profile)
and COPYs data/deploy/*.csv in FK-safe order. The local dev dataset
(data/clean/) is untouched and can restore the full database at any time.

    python scripts/deploy_to_supabase.py
"""
from __future__ import annotations

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPLOY_DIR = os.path.join(ROOT, "data", "deploy")

PLAN = [  # (csv, table) — FK-safe order; column list from each CSV header
    ("amenities.csv", "amenities"),
    ("hosts.csv", "hosts"),
    ("properties.csv", "properties"),
    ("property_images.csv", "property_images"),
    ("property_amenities.csv", "property_amenities"),
    ("reviews.csv", "reviews"),
]


def load_dotenv():
    p = os.path.join(ROOT, ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            s = line.strip()
            if s and not s.startswith("#") and "=" in s:
                k, v = s.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main() -> int:
    load_dotenv()
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        print("ERROR: SUPABASE_DB_URL not set", file=sys.stderr); return 2
    import psycopg2
    conn = psycopg2.connect(dsn); conn.autocommit = False
    cur = conn.cursor()
    cur.execute("set statement_timeout = 0")

    print("Truncating catalog + analytics (space reclaimed immediately) …")
    cur.execute("""
        truncate table reviews, property_amenities, property_images,
                       embeddings, properties, hosts, amenities,
                       analytics.kaggle_listings cascade
    """)

    for csv_name, table in PLAN:
        path = os.path.join(DEPLOY_DIR, csv_name)
        with open(path, encoding="utf-8") as f:
            cols = f.readline().strip()
            f.seek(0)
            cur.copy_expert(
                f"copy {table} ({cols}) from stdin with (format csv, header true, null '')", f)
        cur.execute(f"select count(*) from {table}")
        print(f"  loaded {table:22} {cur.fetchone()[0]:>9,} rows")

    conn.commit()
    conn.autocommit = True
    cur.execute("vacuum analyze")
    cur.execute("select pg_size_pretty(pg_database_size(current_database()))")
    print(f"\nCommit OK. Database size: {cur.fetchone()[0]}")
    cur.close(); conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
