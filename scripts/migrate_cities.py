"""Cities migration + Inside Airbnb import (DB-side, non-destructive).

Steps (idempotent):
  1. populate `cities` from MongoDB properties + Kaggle + Inside Airbnb.
  2. backfill existing properties.city_id.
  3. import the Inside Airbnb clean CSVs (append; staging + ON CONFLICT).
  4. recompute city centroids from member properties.
  5. verify referential integrity + counts.

Requires SUPABASE_DB_URL (from .env). Run AFTER clean_insideairbnb.py.
    python scripts/migrate_cities.py
"""
from __future__ import annotations

import os
import sys
import json

from lib import cleaners as C
from lib import enrichment as E

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IA_DIR = os.path.join(ROOT, "data", "clean", "insideairbnb")


def load_dotenv():
    p = os.path.join(ROOT, ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def header_cols(path):
    with open(path, encoding="utf-8") as f:
        return f.readline().strip()


# --------------------------------------------------------------------------- #
# 1. cities
# --------------------------------------------------------------------------- #
def build_cities(cur):
    merged: dict[str, dict] = {}

    def add(city_name, state, country, source):
        if not city_name:
            return
        key = E.city_key(city_name, country)
        m = merged.setdefault(key, {"key": key, "city_name": city_name,
                                    "state": None, "country": country, "sources": set()})
        if not m["state"] and state:
            m["state"] = state
        if not m["country"] and country:
            m["country"] = country
        m["sources"].add(source)

    # Inside Airbnb first (has clean state), then Mongo, then Kaggle
    ia_path = os.path.join(IA_DIR, "cities_ia.json")
    if os.path.exists(ia_path):
        for c in json.load(open(ia_path, encoding="utf-8")):
            add(c["city_name"], c.get("state"), c.get("country"), "inside_airbnb")

    cur.execute("select city, country from properties where source='mongodb_airbnb' "
                "and city is not null group by city, country")
    for city, country in cur.fetchall():
        add(city, None, country, "mongodb_airbnb")

    # Kaggle is entirely NYC
    cur.execute("select count(*) from analytics.kaggle_listings")
    if cur.fetchone()[0] > 0:
        add("New York", "New York", "United States", "kaggle_open_data")

    rows = []
    for m in merged.values():
        rows.append((
            C.det_uuid("city", m["key"]), m["city_name"], m["state"], m["country"],
            E.continent_for(m["country"]),
            E.timezone_for(m["city_name"], m["country"]),
            E.currency_for(m["city_name"], m["country"]),
            ",".join(sorted(m["sources"])),
        ))
    cur.executemany("""
        insert into cities (id, city_name, state, country, continent, timezone, currency, source_dataset)
        values (%s,%s,%s,%s,%s,%s,%s,%s)
        on conflict (id) do update set
          state = coalesce(cities.state, excluded.state),
          continent = excluded.continent,
          timezone = excluded.timezone,
          currency = excluded.currency,
          source_dataset = excluded.source_dataset,
          updated_at = now()
    """, rows)
    return len(rows)


def backfill_city_id(cur):
    cur.execute("""
        update properties p set city_id = c.id
        from cities c
        where p.city_id is null and p.city is not null
          and lower(regexp_replace(btrim(p.city), '\\s+', ' ', 'g'))
              = lower(regexp_replace(btrim(c.city_name), '\\s+', ' ', 'g'))
          and lower(coalesce(p.country, '')) = lower(coalesce(c.country, ''))
    """)
    return cur.rowcount


# --------------------------------------------------------------------------- #
# 3. import Inside Airbnb (staging + ON CONFLICT)
# --------------------------------------------------------------------------- #
# SQL applied to the staging table before insert (constraint repairs, logged)
STAGE_FIXUPS = {
    "properties": [
        ("nights max<min -> null max",
         "update {stage} set maximum_nights = null "
         "where maximum_nights is not null and minimum_nights is not null "
         "  and maximum_nights < minimum_nights"),
    ],
}


def load_table(cur, csv_name, table, conflict, where=""):
    path = os.path.join(IA_DIR, csv_name)
    cols = header_cols(path)
    stage = "_stage_" + table.split(".")[-1]
    cur.execute(f"drop table if exists {stage}")
    cur.execute(f"create unlogged table {stage} as select {cols} from {table} where false")
    with open(path, encoding="utf-8") as f:
        cur.copy_expert(f"copy {stage} ({cols}) from stdin with (format csv, header true, null '')", f)
    cur.execute(f"select count(*) from {stage}")
    staged = cur.fetchone()[0]
    for label, sql in STAGE_FIXUPS.get(table.split(".")[-1], []):
        cur.execute(sql.format(stage=stage))
        if cur.rowcount:
            print(f"      fixup [{label}]: {cur.rowcount} rows")
    cur.execute(f"""insert into {table} ({cols})
                    select {cols} from {stage} s {where}
                    on conflict {conflict} do nothing""")
    inserted = cur.rowcount
    cur.execute(f"drop table {stage}")
    return staged, inserted


def import_inside_airbnb(cur, conn):
    results = {}
    # commit per table → smaller transactions, resumable, less WAL pressure
    plan = [
        ("hosts", "hosts.csv", "hosts", "(id)", ""),
        ("properties", "properties.csv", "properties", "(id)", ""),
        ("amenities", "amenities.csv", "amenities", "(slug)", ""),
        ("property_images", "property_images.csv", "property_images", "(id)", ""),
        ("property_amenities", "property_amenities.csv", "property_amenities",
         "(property_id, amenity_id)", ""),
        ("reviews", "reviews.csv", "reviews", "(id)",
         "where exists (select 1 from properties p where p.id = s.property_id)"),
    ]
    for key, csv_name, table, conflict, where in plan:
        staged, ins = load_table(cur, csv_name, table, conflict, where)
        conn.commit()
        results[key] = (staged, ins)
        print(f"   {table:20} staged={staged:>10,}  inserted={ins:>10,}  (committed)")
    return results


def recompute_centroids(cur):
    cur.execute("""
        update cities c set latitude = sub.lat, longitude = sub.lng, updated_at = now()
        from (select city_id, round(avg(latitude)::numeric, 6) lat,
                     round(avg(longitude)::numeric, 6) lng
              from properties
              where city_id is not null and latitude is not null
              group by city_id) sub
        where c.id = sub.city_id
    """)
    return cur.rowcount


def main():
    load_dotenv()
    dsn = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    if not dsn:
        print("ERROR: SUPABASE_DB_URL not set", file=sys.stderr); return 2
    import psycopg2
    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute("set statement_timeout = 0")
    cur.execute("set maintenance_work_mem = '256MB'")

    print("1) Populating cities …")
    n_cities = build_cities(cur); conn.commit()
    print(f"   upserted {n_cities} cities")

    print("2) Backfilling existing properties.city_id …")
    n_bf = backfill_city_id(cur); conn.commit()
    print(f"   updated {n_bf:,} properties")

    print("3) Importing Inside Airbnb (staging + ON CONFLICT) …")
    import_inside_airbnb(cur, conn)

    print("4) Recomputing city centroids …")
    n_ctr = recompute_centroids(cur); conn.commit()
    print(f"   updated {n_ctr} city centroids")

    cur.close(); conn.close()
    print("\nMigration data steps complete. Run verify next.")


if __name__ == "__main__":
    raise SystemExit(main())
