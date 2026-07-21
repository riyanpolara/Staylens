"""Build the free-tier DEPLOYMENT dataset from the untouched dev CSVs.

Reads data/clean/ (MongoDB) + data/clean/insideairbnb/ (Inside Airbnb) READ-ONLY
and writes a trimmed, quality-filtered profile to data/deploy/:

  * 300-500 representative properties per city (quality-ranked, deduped)
  * referenced hosts only; full amenity dictionary
  * ALL amenity links for kept properties (from the full local link CSVs)
  * latest 8 reviews per kept property (Mongo + Inside Airbnb)
  * property images for kept properties

The dev dataset on disk is never modified.

    python scripts/build_deploy_dataset.py
"""
from __future__ import annotations

import csv
import json
import os
from collections import defaultdict

from lib import cleaners as C
from lib import enrichment as E

csv.field_size_limit(10**9)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MONGO_DIR = os.path.join(ROOT, "data", "clean")
IA_DIR = os.path.join(ROOT, "data", "clean", "insideairbnb")
OUT_DIR = os.path.join(ROOT, "data", "deploy")

CITY_CAP = 450          # max per city (within the requested 300-500 band)
REVIEWS_PER_PROP = 8    # latest N reviews per kept property (requested 7-10)

# unified output columns = IA layout (superset, includes city_id)
PROP_COLS = None        # taken from IA properties.csv header
HOST_COLS = None        # taken from IA hosts.csv header (includes acceptance_rate)
REVIEW_COLS = ["id", "property_id", "source", "source_review_id",
               "reviewer_source_id", "reviewer_name", "review_date", "comments"]
IMAGE_COLS = ["id", "property_id", "url", "image_type", "sort_order", "is_primary"]
AMEN_COLS = ["id", "name", "slug", "category"]


def read_header(path):
    with open(path, encoding="utf-8", newline="") as f:
        return next(csv.reader(f))


def stream(path):
    with open(path, encoding="utf-8", newline="") as f:
        yield from csv.DictReader(f)


def f_or(v, default):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def mongo_city_id(row):
    """Recompute city_id for Mongo rows exactly as migrate_cities.py did."""
    city, country = row.get("city") or "", row.get("country") or ""
    if not city.strip():
        return None
    return C.det_uuid("city", E.city_key(city, country))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    global PROP_COLS, HOST_COLS
    PROP_COLS = read_header(os.path.join(IA_DIR, "properties.csv"))
    HOST_COLS = read_header(os.path.join(IA_DIR, "hosts.csv"))

    # ------------------------------------------------------------------ #
    # 1. candidate properties (both sources), quality gate + score
    # ------------------------------------------------------------------ #
    by_city: dict[str, list] = defaultdict(list)
    stats = defaultdict(int)

    def consider(row, source_dir_cols):
        stats["candidates"] += 1
        # unify to IA column layout
        u = {c: row.get(c, "") for c in PROP_COLS}
        if not u.get("city_id"):
            u["city_id"] = mongo_city_id(row) or ""
        # ---- quality gate ----
        if not u["city_id"]:
            stats["dropped_no_city"] += 1; return
        if (u.get("name") or "").strip() in ("", "(untitled)"):
            stats["dropped_untitled"] += 1; return
        if not (u.get("description") or "").strip() and not (u.get("summary") or "").strip():
            stats["dropped_no_description"] += 1; return
        if not (u.get("price") or "").strip():
            stats["dropped_no_price"] += 1; return
        score = (f_or(u.get("number_of_reviews"), 0),
                 f_or(u.get("review_scores_rating"), -1))
        by_city[u["city_id"]].append((score, u))

    for row in stream(os.path.join(MONGO_DIR, "properties.csv")):
        consider(row, MONGO_DIR)
    for row in stream(os.path.join(IA_DIR, "properties.csv")):
        consider(row, IA_DIR)

    # ------------------------------------------------------------------ #
    # 2. rank, dedupe, cap per city
    # ------------------------------------------------------------------ #
    kept: dict[str, dict] = {}
    per_city_kept = {}
    for city_id, cands in by_city.items():
        cands.sort(key=lambda t: (t[0][0], t[0][1], t[1]["source_id"]), reverse=True)
        seen_keys = set()
        n = 0
        for _, u in cands:
            dk = ((u.get("name") or "").strip().lower(), u.get("host_id") or "")
            if dk in seen_keys:
                stats["dropped_duplicate"] += 1
                continue
            seen_keys.add(dk)
            kept[u["id"]] = u
            n += 1
            if n >= CITY_CAP:
                break
        per_city_kept[city_id] = n
    stats["properties_kept"] = len(kept)

    with open(os.path.join(OUT_DIR, "properties.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(PROP_COLS)
        for u in kept.values():
            w.writerow([u.get(c, "") for c in PROP_COLS])

    kept_ids = set(kept.keys())
    kept_host_ids = {u["host_id"] for u in kept.values() if u.get("host_id")}

    # ------------------------------------------------------------------ #
    # 3. hosts (referenced only; Mongo rows lack acceptance_rate → blank)
    # ------------------------------------------------------------------ #
    n_hosts = 0
    with open(os.path.join(OUT_DIR, "hosts.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(HOST_COLS)
        for src in (os.path.join(MONGO_DIR, "hosts.csv"), os.path.join(IA_DIR, "hosts.csv")):
            for row in stream(src):
                if row["id"] in kept_host_ids:
                    w.writerow([row.get(c, "") for c in HOST_COLS])
                    kept_host_ids.discard(row["id"])   # each host once
                    n_hosts += 1
    stats["hosts_kept"] = n_hosts

    # ------------------------------------------------------------------ #
    # 4. amenities (full dictionary; same slug -> same deterministic id)
    # ------------------------------------------------------------------ #
    amen = {}
    for src in (os.path.join(MONGO_DIR, "amenities.csv"), os.path.join(IA_DIR, "amenities.csv")):
        for row in stream(src):
            amen.setdefault(row["id"], row)
    with open(os.path.join(OUT_DIR, "amenities.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(AMEN_COLS)
        for row in amen.values():
            w.writerow([row.get(c, "") for c in AMEN_COLS])
    stats["amenities_kept"] = len(amen)

    # ------------------------------------------------------------------ #
    # 5. amenity links + images for kept properties
    # ------------------------------------------------------------------ #
    n_links = 0
    seen_links = set()
    with open(os.path.join(OUT_DIR, "property_amenities.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["property_id", "amenity_id"])
        for src in (os.path.join(MONGO_DIR, "property_amenities.csv"),
                    os.path.join(IA_DIR, "property_amenities.csv")):
            for row in stream(src):
                if row["property_id"] in kept_ids:
                    key = (row["property_id"], row["amenity_id"])
                    if key in seen_links:
                        continue
                    seen_links.add(key)
                    w.writerow([row["property_id"], row["amenity_id"]])
                    n_links += 1
    stats["links_kept"] = n_links

    n_img = 0
    with open(os.path.join(OUT_DIR, "property_images.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(IMAGE_COLS)
        for src in (os.path.join(MONGO_DIR, "property_images.csv"),
                    os.path.join(IA_DIR, "property_images.csv")):
            for row in stream(src):
                if row["property_id"] in kept_ids:
                    w.writerow([row.get(c, "") for c in IMAGE_COLS])
                    n_img += 1
    stats["images_kept"] = n_img

    # ------------------------------------------------------------------ #
    # 6. latest N reviews per kept property (streams the 1.6 GB IA file)
    # ------------------------------------------------------------------ #
    top: dict[str, list] = defaultdict(list)

    def offer(row):
        pid = row["property_id"]
        if pid not in kept_ids:
            return
        d = row.get("review_date") or ""
        lst = top[pid]
        lst.append((d, row))
        if len(lst) > REVIEWS_PER_PROP * 3:     # prune periodically
            lst.sort(key=lambda t: t[0], reverse=True)
            del lst[REVIEWS_PER_PROP:]

    for src in (os.path.join(MONGO_DIR, "reviews.csv"), os.path.join(IA_DIR, "reviews.csv")):
        for row in stream(src):
            offer(row)

    n_rev = 0
    with open(os.path.join(OUT_DIR, "reviews.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(REVIEW_COLS)
        for pid, lst in top.items():
            lst.sort(key=lambda t: t[0], reverse=True)
            for _, row in lst[:REVIEWS_PER_PROP]:
                w.writerow([row.get(c, "") for c in REVIEW_COLS])
                n_rev += 1
    stats["reviews_kept"] = n_rev
    stats["props_with_reviews"] = len(top)

    # ------------------------------------------------------------------ #
    with open(os.path.join(OUT_DIR, "build_stats.json"), "w", encoding="utf-8") as f:
        json.dump({"stats": dict(stats), "per_city_kept": per_city_kept}, f, indent=2)
    print(json.dumps(dict(stats), indent=2))
    print(f"\nWrote {OUT_DIR}")


if __name__ == "__main__":
    main()
