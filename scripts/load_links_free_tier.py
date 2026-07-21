"""Free-tier loader for Inside Airbnb property_amenities (top-50 amenities).

Why this shape (see migration_report.md for the full story):
  * Free-tier disk (~1 GB incl. WAL) can't hold all 3.49M links + indexes, so we
    load the 2.48M links belonging to the 50 most common amenities (71%). The
    full CSV is retained for a post-upgrade backfill.
  * Direct COPY into the live table was killed twice because per-row FK triggers
    made it crawl (~1.5k rows/s). We drop the two FKs, bulk-load fast, then
    re-add them NOT VALID + VALIDATE (set-based, restores full integrity).
  * Chunked commits (200k) keep WAL bounded so checkpoints can recycle it.

    python scripts/load_links_free_tier.py
"""
from __future__ import annotations

import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT, "data", "clean", "insideairbnb",
                        "property_amenities_top50.csv")
CHUNK = 200_000


def load_dotenv():
    p = os.path.join(ROOT, ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            s = line.strip()
            if s and not s.startswith("#") and "=" in s:
                k, v = s.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    load_dotenv()
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        print("ERROR: SUPABASE_DB_URL not set", file=sys.stderr)
        return 2
    import psycopg2
    from psycopg2 import errors

    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("set statement_timeout = 0")

    print("VACUUM property_amenities (reuse aborted-insert space) ...")
    cur.execute("vacuum property_amenities")

    print("Dropping FKs + secondary index for bulk load ...")
    cur.execute("alter table property_amenities "
                "drop constraint if exists property_amenities_property_id_fkey")
    cur.execute("alter table property_amenities "
                "drop constraint if exists property_amenities_amenity_id_fkey")
    cur.execute("drop index if exists idx_prop_amen_amenity")

    conn.autocommit = False
    total = loaded = 0
    disk_full = False
    with open(CSV_PATH, encoding="utf-8") as f:
        f.readline()  # header
        buf: list[str] = []
        while True:
            line = f.readline()
            if line:
                buf.append(line)
                total += 1
            if buf and (len(buf) >= CHUNK or not line):
                try:
                    cur.execute("set local statement_timeout = 0")
                    cur.copy_expert(
                        "copy property_amenities (property_id, amenity_id) "
                        "from stdin with (format csv, null '')",
                        io.StringIO("".join(buf)))
                    conn.commit()
                    loaded += len(buf)
                    print(f"  committed +{len(buf):,}  ({loaded:,}/{total:,})")
                except errors.DiskFull:
                    conn.rollback()
                    disk_full = True
                    print(f"  DISK FULL — stopping. committed={loaded:,}", file=sys.stderr)
                    break
                buf = []
            if not line:
                break

    conn.autocommit = True
    print("Re-adding FKs (NOT VALID, then VALIDATE) ...")
    cur.execute("set statement_timeout = 0")
    cur.execute("""alter table property_amenities
                   add constraint property_amenities_property_id_fkey
                   foreign key (property_id) references properties(id)
                   on delete cascade not valid""")
    cur.execute("""alter table property_amenities
                   add constraint property_amenities_amenity_id_fkey
                   foreign key (amenity_id) references amenities(id)
                   on delete cascade not valid""")
    cur.execute("alter table property_amenities "
                "validate constraint property_amenities_property_id_fkey")
    print("  property_id FK validated")
    cur.execute("alter table property_amenities "
                "validate constraint property_amenities_amenity_id_fkey")
    print("  amenity_id FK validated")

    cur.execute("vacuum analyze property_amenities")
    cur.execute("select count(*) from property_amenities")
    final = cur.fetchone()[0]
    cur.execute("select pg_size_pretty(pg_database_size(current_database()))")
    size = cur.fetchone()[0]
    cur.close(); conn.close()
    print(f"\nDone. loaded={loaded:,}/{total:,}; table now {final:,} rows; db={size}"
          + ("  (STOPPED EARLY: disk full)" if disk_full else ""))
    return 3 if disk_full else 0


if __name__ == "__main__":
    raise SystemExit(main())
