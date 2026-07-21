"""Post-migration verification + report (cities + Inside Airbnb import).

Writes migration_report.md. Exit 0 if all integrity checks pass.
    python scripts/verify_migration.py
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT = os.path.join(ROOT, "migration_report.md")


def load_dotenv():
    p = os.path.join(ROOT, ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            s = line.strip()
            if s and not s.startswith("#") and "=" in s:
                k, v = s.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    load_dotenv()
    dsn = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    if not dsn:
        print("ERROR: SUPABASE_DB_URL not set", file=sys.stderr); return 2
    import psycopg2
    conn = psycopg2.connect(dsn); conn.autocommit = True
    cur = conn.cursor()

    def one(q, *a):
        cur.execute(q, a); return cur.fetchone()[0]

    def rows(q, *a):
        cur.execute(q, a); return cur.fetchall()

    # ---- counts ----
    totals = {t: one(f"select count(*) from {t}") for t in
              ["cities", "hosts", "properties", "amenities", "property_amenities",
               "property_images", "reviews", "embeddings", "analytics.kaggle_listings"]}
    by_src = dict(rows("select source, count(*) from properties group by source order by 2 desc"))
    rev_src = dict(rows("select source, count(*) from reviews group by source order by 2 desc"))

    # ---- city_id coverage ----
    city_cov = rows("""select source, count(*) total, count(city_id) with_city,
                              count(*)-count(city_id) missing
                       from properties group by source order by 1""")

    # ---- integrity (want 0) ----
    checks = {
        "orphan properties.host_id -> hosts":
            "select count(*) from properties p left join hosts h on h.id=p.host_id where p.host_id is not null and h.id is null",
        "orphan properties.city_id -> cities":
            "select count(*) from properties p left join cities c on c.id=p.city_id where p.city_id is not null and c.id is null",
        "orphan property_images.property_id -> properties":
            "select count(*) from property_images i left join properties p on p.id=i.property_id where p.id is null",
        "orphan reviews.property_id -> properties":
            "select count(*) from reviews r left join properties p on p.id=r.property_id where p.id is null",
        "orphan property_amenities.property_id -> properties":
            "select count(*) from property_amenities pa left join properties p on p.id=pa.property_id where p.id is null",
        "orphan property_amenities.amenity_id -> amenities":
            "select count(*) from property_amenities pa left join amenities a on a.id=pa.amenity_id where a.id is null",
        "duplicate properties (source, source_id)":
            "select count(*) from (select source,source_id from properties group by 1,2 having count(*)>1) d",
        "duplicate hosts (source, source_host_id)":
            "select count(*) from (select source,source_host_id from hosts group by 1,2 having count(*)>1) d",
        "duplicate amenities.slug":
            "select count(*) from (select slug from amenities group by 1 having count(*)>1) d",
        "duplicate reviews (source, source_review_id)":
            "select count(*) from (select source,source_review_id from reviews where source_review_id is not null group by 1,2 having count(*)>1) d",
        "duplicate property_amenities PK":
            "select count(*) from (select property_id,amenity_id from property_amenities group by 1,2 having count(*)>1) d",
        "duplicate cities (name, country)":
            "select count(*) from (select lower(city_name),lower(coalesce(country,'')) from cities group by 1,2 having count(*)>1) d",
    }
    results = {name: one(q) for name, q in checks.items()}

    # ---- semantic search verification (temporary demo vectors on new IA props) ----
    sem = {}
    try:
        cur.execute("""
            insert into embeddings (property_id, content, content_hash, embedding, model)
            select p.id, left(p.name,80), md5(p.id::text),
                   (select array_agg(((('x'||substr(md5(p.id::text||g::text),1,8))::bit(32)::int)/2147483647.0))
                    from generate_series(1,1536) g)::vector(1536),
                   'demo-migration'
            from (select id,name from properties where source='inside_airbnb' order by source_id limit 200) p
            on conflict (property_id) do nothing
        """)
        sem["match_rows"] = one("""select count(*) from match_properties(
            (select embedding from embeddings where model='demo-migration' limit 1), 10)""")
        sem["match_top_sim"] = float(one("""select max(round(similarity::numeric,4)) from match_properties(
            (select embedding from embeddings where model='demo-migration' limit 1), 10)"""))
        sem["similar_rows"] = one("""select count(*) from similar_properties(
            (select property_id from embeddings where model='demo-migration' limit 1), 10)""")
        cur.execute("delete from embeddings where model='demo-migration'")
        sem["ok"] = sem["match_rows"] > 0 and sem["similar_rows"] > 0 and sem["match_top_sim"] >= 0.99
    except Exception as e:
        sem["error"] = str(e).splitlines()[0]
        sem["ok"] = False

    # ---- sample cities ----
    sample_cities = rows("""select city_name, coalesce(state,'-'), country, continent, currency,
                                   timezone, source_dataset,
                                   (select count(*) from properties p where p.city_id=c.id) props
                            from cities c order by props desc limit 15""")

    integ_ok = all(v == 0 for v in results.values())
    all_ok = integ_ok and sem.get("ok")

    # ---- console ----
    print("Totals:", totals)
    print("Properties by source:", by_src)
    print("Reviews by source:", rev_src)
    print("Integrity (want 0):")
    for k, v in results.items():
        print(f"  [{'PASS' if v==0 else 'FAIL'}] {k}: {v}")
    print("Semantic:", sem)
    print("OVERALL:", "PASS" if all_ok else "FAIL")

    # ---- report ----
    L = []; a = L.append
    a("# StayLens — Cities Migration & Inside Airbnb Import Report")
    a("")
    a(f"_Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} by "
      f"`scripts/verify_migration.py` against the live Supabase database._")
    a("")
    a(f"## Result: {'✅ PASS' if all_ok else '❌ FAIL'}")
    a("")
    a("## Final row counts (all tables)")
    a("")
    a("| Table | Rows |")
    a("|---|---:|")
    for t in ["cities", "hosts", "properties", "amenities", "property_amenities",
              "property_images", "reviews", "embeddings", "analytics.kaggle_listings"]:
        a(f"| {t} | {totals[t]:,} |")
    a("")
    a("### Properties by source")
    a("")
    a("| Source | Properties |")
    a("|---|---:|")
    for s, n in by_src.items():
        a(f"| {s} | {n:,} |")
    a("")
    a("### Reviews by source")
    a("")
    a("| Source | Reviews |")
    a("|---|---:|")
    for s, n in rev_src.items():
        a(f"| {s} | {n:,} |")
    a("")
    a("### city_id coverage (backfill result)")
    a("")
    a("| Source | Properties | With city | Missing city_id |")
    a("|---|---:|---:|---:|")
    for src, tot, wc, miss in city_cov:
        a(f"| {src} | {tot:,} | {wc:,} | {miss:,} |")
    a("")
    a("## Integrity checks")
    a("")
    a("| Check | Count | Status |")
    a("|---|---:|---|")
    for k, v in results.items():
        a(f"| {k} | {v} | {'✅ PASS' if v==0 else '❌ FAIL'} |")
    a("")
    a("## Semantic search (pgvector) after migration")
    a("")
    if sem.get("error"):
        a(f"- ❌ error: `{sem['error']}`")
    else:
        a(f"- `match_properties` returned **{sem['match_rows']}** rows (top similarity "
          f"**{sem['match_top_sim']}**) against newly-imported Inside Airbnb properties.")
        a(f"- `similar_properties` returned **{sem['similar_rows']}** rows.")
        a("- (Temporary deterministic demo vectors were used to exercise the HNSW index, "
          "then removed. Real vectors: run `generate_embeddings.py --source inside_airbnb` "
          "with `OPENAI_API_KEY` set.)")
    a("")
    a("## Top cities by property count")
    a("")
    a("| City | State | Country | Continent | Currency | Timezone | Sources | Properties |")
    a("|---|---|---|---|---|---|---|---:|")
    for cn, st, co, cont, cur_, tz, src, n in sample_cities:
        a(f"| {cn} | {st} | {co} | {cont or '-'} | {cur_ or '-'} | {tz or '-'} | {src} | {n:,} |")
    a("")
    a("## Notes")
    a("- Migration was **non-destructive**: no tables dropped/recreated; `city`/`country` "
      "columns retained alongside the new `city_id`.")
    a("- Kaggle Open Data remains isolated in the `analytics` schema (not merged).")
    a("- **Scope decisions (Supabase Free tier, ~1 GB disk incl. WAL):**")
    a("  - Inside Airbnb *reviews* (4,363,757 rows, ~3–4 GB) **skipped** — cannot fit. "
      "Clean CSV retained at `data/clean/insideairbnb/reviews.csv` for post-upgrade load. "
      "MongoDB's 149,792 reviews remain fully loaded.")
    a("  - Inside Airbnb *amenity links* trimmed to the **top-50 most common amenities** "
      "(2,480,763 of 3,491,895 links, 71%) — full set does not fit. Full CSV retained at "
      "`data/clean/insideairbnb/property_amenities.csv`.")
    a("  - Secondary index `idx_prop_amen_amenity` (reverse amenity→property lookup) "
      "dropped to save ~100 MB; recreate after a plan upgrade: "
      "`create index idx_prop_amen_amenity on property_amenities (amenity_id);`")
    a("  - Bulk-load used temporary FK drop + `NOT VALID`/`VALIDATE` re-add; both FKs are "
      "**re-validated** (full referential integrity enforced).")
    a("")

    with open(REPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    print(f"Wrote {REPORT}")
    cur.close(); conn.close()
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
