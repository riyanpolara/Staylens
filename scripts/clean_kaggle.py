"""Phase 3 — ETL for the SECONDARY dataset (Kaggle Airbnb Open Data).

Cleans `Airbnb_Open_Data.csv` into `data/clean/kaggle_listings.csv`, aligned to
`analytics.kaggle_listings`. Kept entirely separate from the primary catalog
(no merge, no shared ids).

Run:  python scripts/clean_kaggle.py
"""
from __future__ import annotations

import csv
import json
import os
from collections import Counter
from datetime import datetime, timezone

import pandas as pd

from lib import cleaners as C

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT, "Airbnb_Open_Data.csv")
CLEAN_DIR = os.path.join(ROOT, "data", "clean")
LOG_DIR = os.path.join(ROOT, "data", "logs")
LOG_PATH = os.path.join(LOG_DIR, "clean_kaggle_log.jsonl")

OUT_COLS = ["id", "name", "host_id", "host_identity_verified", "host_name",
            "neighbourhood_group", "neighbourhood", "latitude", "longitude",
            "country", "country_code", "instant_bookable", "cancellation_policy",
            "room_type", "construction_year", "price", "service_fee",
            "minimum_nights", "number_of_reviews", "last_review",
            "reviews_per_month", "review_rate_number", "calculated_host_listings",
            "availability_365", "house_rules", "license"]


def run():
    os.makedirs(CLEAN_DIR, exist_ok=True)
    os.makedirs(LOG_DIR, exist_ok=True)
    issues = Counter()
    samples = {}

    def log(kind, **extra):
        issues[kind] += 1
        samples.setdefault(kind, [])
        if len(samples[kind]) < 5:
            samples[kind].append(extra)

    df = pd.read_csv(CSV_PATH, dtype=str, keep_default_na=False, low_memory=False)
    rows_in = len(df)

    # drop full-row duplicates + duplicate ids (keep first)
    df = df.drop_duplicates()
    df = df.drop_duplicates(subset=["id"], keep="first")
    dups_removed = rows_in - len(df)

    out_path = os.path.join(CLEAN_DIR, "kaggle_listings.csv")
    written = 0
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(OUT_COLS)
        for rec in df.to_dict("records"):
            rid = C.parse_int(rec.get("id"))
            if rid is None:
                log("missing_id"); continue

            hiv_raw = C.clean_text(rec.get("host_identity_verified"))
            hiv = True if hiv_raw == "verified" else (False if hiv_raw == "unconfirmed" else None)

            min_nights = C.parse_int(rec.get("minimum nights"))
            if min_nights is not None and min_nights < 0:
                log("negative_min_nights", id=rid, raw=rec.get("minimum nights"))
                min_nights = None

            avail = C.parse_int(rec.get("availability 365"))
            if avail is not None and not (0 <= avail <= 365):
                log("availability_out_of_range", id=rid, raw=rec.get("availability 365"))
                avail = None

            house_rules = C.clean_text(rec.get("house_rules"))
            if house_rules == "#NAME?":       # Excel formula-error artifact
                log("house_rules_excel_error", id=rid)
                house_rules = None

            price = C.parse_money(rec.get("price"))
            if rec.get("price") and price is None:
                log("price_unparseable", id=rid, raw=rec.get("price"))

            row = {
                "id": rid,
                "name": C.collapse_ws(rec.get("NAME")),
                "host_id": C.parse_int(rec.get("host id")),
                "host_identity_verified": hiv,
                "host_name": C.collapse_ws(rec.get("host name")),
                "neighbourhood_group": C.normalize_neigh_group(rec.get("neighbourhood group")),
                "neighbourhood": C.clean_text(rec.get("neighbourhood")),
                "latitude": _f(rec.get("lat")),
                "longitude": _f(rec.get("long")),
                "country": C.clean_text(rec.get("country")),
                "country_code": C.clean_text(rec.get("country code")),
                "instant_bookable": C.parse_bool(rec.get("instant_bookable")),
                "cancellation_policy": C.clean_text(rec.get("cancellation_policy")),
                "room_type": C.normalize_room_type(rec.get("room type")),
                "construction_year": C.parse_int(rec.get("Construction year")),
                "price": price,
                "service_fee": C.parse_money(rec.get("service fee")),
                "minimum_nights": min_nights,
                "number_of_reviews": C.parse_int(rec.get("number of reviews"), lo=0),
                "last_review": C.parse_date_mdy(rec.get("last review")),
                "reviews_per_month": C.parse_decimal(rec.get("reviews per month"), places=2),
                "review_rate_number": C.parse_int(rec.get("review rate number")),
                "calculated_host_listings": C.parse_int(rec.get("calculated host listings count"), lo=0),
                "availability_365": avail,
                "house_rules": house_rules,
                "license": C.clean_text(rec.get("license")),
            }
            w.writerow([_csv(row[c]) for c in OUT_COLS])
            written += 1

    with open(LOG_PATH, "w", encoding="utf-8") as f:
        f.write(json.dumps({"ts": datetime.now(timezone.utc).isoformat(),
                            "dataset": "kaggle_open_data",
                            "rows_in": rows_in, "rows_out": written,
                            "duplicates_removed": dups_removed}) + "\n")
        for kind, cnt in issues.most_common():
            f.write(json.dumps({"issue": kind, "count": cnt, "samples": samples[kind]}) + "\n")

    return {"rows_in": rows_in, "rows_out": written,
            "duplicates_removed": dups_removed, "issues": dict(issues)}


def _f(v):
    try:
        return round(float(str(v).strip()), 6) if str(v).strip() else None
    except (ValueError, TypeError):
        return None


def _csv(v):
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    return v


if __name__ == "__main__":
    r = run()
    print("Kaggle ETL complete:")
    print(f"  rows_in={r['rows_in']:,}  rows_out={r['rows_out']:,}  "
          f"duplicates_removed={r['duplicates_removed']:,}")
    if r["issues"]:
        print("Data-quality issues:")
        for k, v in sorted(r["issues"].items(), key=lambda x: -x[1]):
            print(f"  {k:28} {v:>10,}")
