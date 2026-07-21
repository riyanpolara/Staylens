"""Generate a small, self-consistent sample seed (`sql/seed_sample.sql`).

Picks N properties from the clean CSVs and emits INSERTs for them plus every
row they depend on (hosts, all amenities, their images/links/reviews). Used to
validate that the cleaned data satisfies the live schema before a full import.
Every value is emitted as a quoted string literal (empty -> NULL); Postgres
coerces to the target column type.
"""
from __future__ import annotations

import csv
import os
import sys

csv.field_size_limit(10**9)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLEAN = os.path.join(ROOT, "data", "clean")
OUT = os.path.join(ROOT, "sql", "seed_sample.sql")
N = int(sys.argv[1]) if len(sys.argv) > 1 else 40
REVIEWS_PER = int(sys.argv[2]) if len(sys.argv) > 2 else 5


def rows(name):
    with open(os.path.join(CLEAN, name), encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def lit(v):
    if v is None or v == "":
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def insert(table, cols, records, conflict="(id) do nothing"):
    if not records:
        return ""
    out = [f"insert into {table} ({','.join(cols)}) values"]
    vals = [f"  ({','.join(lit(r.get(c)) for c in cols)})" for r in records]
    out.append(",\n".join(vals))
    out.append(f"on conflict {conflict};\n")
    return "\n".join(out)


def main():
    props = rows("properties.csv")[:N]
    prop_ids = {p["id"] for p in props}
    host_ids = {p["host_id"] for p in props if p["host_id"]}

    hosts = [h for h in rows("hosts.csv") if h["id"] in host_ids]
    images = [i for i in rows("property_images.csv") if i["property_id"] in prop_ids]
    links = [l for l in rows("property_amenities.csv") if l["property_id"] in prop_ids]
    used_amen = {l["amenity_id"] for l in links}
    amenities = [a for a in rows("amenities.csv") if a["id"] in used_amen]

    reviews, seen = [], {}
    for r in rows("reviews.csv"):
        if r["property_id"] in prop_ids and seen.get(r["property_id"], 0) < REVIEWS_PER:
            reviews.append(r)
            seen[r["property_id"]] = seen.get(r["property_id"], 0) + 1

    prop_cols = list(props[0].keys())
    host_cols = list(hosts[0].keys())
    amen_cols = ["id", "name", "slug", "category"]
    img_cols = ["id", "property_id", "url", "image_type", "sort_order", "is_primary"]
    rev_cols = ["id", "property_id", "source", "source_review_id",
                "reviewer_source_id", "reviewer_name", "review_date", "comments"]

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("-- StayLens sample seed (generated). Safe to re-run (ON CONFLICT DO NOTHING).\n")
        f.write("-- Loads {} properties + dependencies for schema validation / demos.\n\n".format(len(props)))
        f.write(insert("amenities", amen_cols, amenities))
        f.write("\n")
        f.write(insert("hosts", host_cols, hosts))
        f.write("\n")
        f.write(insert("properties", prop_cols, props))
        f.write("\n")
        f.write(insert("property_images", img_cols, images))
        f.write("\n")
        f.write(insert("property_amenities", ["property_id", "amenity_id"], links,
                       conflict="(property_id, amenity_id) do nothing"))
        f.write("\n")
        f.write(insert("reviews", rev_cols, reviews))

    print(f"Wrote {OUT}: {len(amenities)} amenities, {len(hosts)} hosts, "
          f"{len(props)} properties, {len(images)} images, {len(links)} links, "
          f"{len(reviews)} reviews")


if __name__ == "__main__":
    main()
