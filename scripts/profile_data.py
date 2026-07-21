"""Phase 1 — Data profiling for StayLens.

Profiles BOTH source datasets and writes a comprehensive `data_profile.md`
plus a machine-readable `data/logs/profile_stats.json`.

  Dataset 1 (PRIMARY):   listingsAndReviews.json  (MongoDB Sample Airbnb, NDJSON extended-JSON)
  Dataset 2 (SECONDARY): Airbnb_Open_Data.csv     (Kaggle Airbnb Open Data)

Run:  python scripts/profile_data.py
"""
from __future__ import annotations

import json
import os
from collections import Counter
from datetime import datetime, date, timezone
from decimal import Decimal

import numpy as np
import pandas as pd

from lib.mongo_json import iter_listings

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "listingsAndReviews.json")
CSV_PATH = os.path.join(ROOT, "Airbnb_Open_Data.csv")
OUT_MD = os.path.join(ROOT, "data_profile.md")
LOG_DIR = os.path.join(ROOT, "data", "logs")
OUT_JSON = os.path.join(LOG_DIR, "profile_stats.json")

MONEY_HINT = ("price", "fee", "deposit", "service", "extra_people")
GEO_HINT = ("lat", "long", "latitude", "longitude", "coordinate")


# --------------------------------------------------------------------------- #
# Generic column profiling
# --------------------------------------------------------------------------- #
def numeric_stats(s: pd.Series) -> dict:
    s = pd.to_numeric(s, errors="coerce").dropna()
    if s.empty:
        return {}
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    outliers = int(((s < lo) | (s > hi)).sum())
    return {
        "min": round(float(s.min()), 4),
        "p25": round(float(q1), 4),
        "median": round(float(s.median()), 4),
        "mean": round(float(s.mean()), 4),
        "p75": round(float(q3), 4),
        "p95": round(float(s.quantile(0.95)), 4),
        "max": round(float(s.max()), 4),
        "std": round(float(s.std()), 4),
        "outliers_iqr": outliers,
        "outlier_bounds": [round(float(lo), 2), round(float(hi), 2)],
    }


def suggest_pg_type(name: str, s: pd.Series, distinct: int, n: int) -> str:
    lname = name.lower()
    non_null = s.dropna()
    if non_null.empty:
        return "TEXT"
    sample = non_null.iloc[0]

    if pd.api.types.is_bool_dtype(s) or isinstance(sample, (bool, np.bool_)):
        return "BOOLEAN"
    if isinstance(sample, (datetime, pd.Timestamp, date)):
        return "TIMESTAMPTZ"
    if pd.api.types.is_integer_dtype(s) or isinstance(sample, (int, np.integer)):
        mx = pd.to_numeric(non_null, errors="coerce").max()
        return "BIGINT" if pd.notna(mx) and mx > 2_147_483_647 else "INTEGER"
    if pd.api.types.is_float_dtype(s) or isinstance(sample, (float, np.floating, Decimal)):
        if any(h in lname for h in GEO_HINT):
            return "DOUBLE PRECISION"
        if any(h in lname for h in MONEY_HINT):
            return "NUMERIC(10,2)"
        return "NUMERIC"

    # object / string
    lengths = non_null.astype(str).str.len()
    maxlen = int(lengths.max())
    vals = set(non_null.astype(str).str.strip().str.lower().unique())
    if vals <= {"true", "false", "t", "f", "yes", "no", "0", "1"}:
        return "BOOLEAN"
    if "url" in lname or non_null.astype(str).str.startswith("http").mean() > 0.8:
        return "TEXT  -- URL"
    if any(h in lname for h in MONEY_HINT):
        return "NUMERIC(10,2)  -- parse from currency string"
    if maxlen > 255:
        return "TEXT"
    if distinct <= 30 and distinct / max(n, 1) < 0.05:
        return f"TEXT  -- low-cardinality ({distinct}); enum candidate"
    return f"VARCHAR({min(((maxlen // 32) + 1) * 32, 512)})"


def profile_series(name: str, s: pd.Series, n: int, top_k: int = 8) -> dict:
    non_null = s.dropna()
    nulls = n - len(non_null)
    distinct = int(non_null.nunique())
    info = {
        "column": name,
        "pandas_dtype": str(s.dtype),
        "non_null": int(len(non_null)),
        "null_pct": round(nulls / n * 100, 2) if n else 0,
        "distinct": distinct,
        "distinct_pct": round(distinct / n * 100, 2) if n else 0,
        "pg_type": suggest_pg_type(name, s, distinct, n),
    }
    # datetime? (check first — to_numeric would turn dates into epoch-ns)
    if pd.api.types.is_datetime64_any_dtype(s) and len(non_null):
        info["date"] = {
            "min": non_null.min().strftime("%Y-%m-%d"),
            "max": non_null.max().strftime("%Y-%m-%d"),
        }
        return info
    # identifier / url columns: skip numeric stats, they aren't quantities
    is_idlike = ("url" in name.lower() or name.lower().endswith("_id")
                 or name.lower() in ("_id", "id", "host id"))
    numeric = pd.to_numeric(non_null, errors="coerce")
    if numeric.notna().mean() > 0.9 and not pd.api.types.is_bool_dtype(s) and not is_idlike:
        info["numeric"] = numeric_stats(non_null)
    else:
        vc = non_null.astype(str).value_counts().head(top_k)
        info["top_values"] = [(v[:60], int(c)) for v, c in vc.items()]
    return info


# --------------------------------------------------------------------------- #
# Dataset 1 — MongoDB JSON
# --------------------------------------------------------------------------- #
def flatten_scalars(rec: dict, parent: str = "", out: dict | None = None) -> dict:
    if out is None:
        out = {}
    for k, v in rec.items():
        key = f"{parent}{k}"
        if isinstance(v, dict):
            flatten_scalars(v, key + ".", out)
        elif isinstance(v, list):
            continue  # arrays handled separately
        else:
            out[key] = float(v) if isinstance(v, Decimal) else v
    return out


def profile_mongo() -> dict:
    flat_rows = []
    amenities_counter: Counter = Counter()
    verif_counter: Counter = Counter()
    amenities_per_listing = []
    reviews_per_listing = []
    images_nonempty = Counter()
    review_comment_lengths = []
    coord_rows = []
    total_reviews = 0
    n = 0

    for rec in iter_listings(JSON_PATH):
        n += 1
        flat = flatten_scalars(rec)
        flat_rows.append(flat)

        am = rec.get("amenities") or []
        amenities_counter.update(am)
        amenities_per_listing.append(len(am))

        host = rec.get("host") or {}
        verif_counter.update(host.get("host_verifications") or [])

        imgs = rec.get("images") or {}
        for f in ("thumbnail_url", "medium_url", "picture_url", "xl_picture_url"):
            if (imgs.get(f) or "").strip():
                images_nonempty[f] += 1

        revs = rec.get("reviews") or []
        reviews_per_listing.append(len(revs))
        total_reviews += len(revs)
        for r in revs[:5]:  # sample comment lengths cheaply
            c = r.get("comments") or ""
            review_comment_lengths.append(len(c))

        loc = ((rec.get("address") or {}).get("location") or {})
        coords = loc.get("coordinates") or []
        if len(coords) == 2:
            coord_rows.append({"longitude": coords[0], "latitude": coords[1]})

    df = pd.DataFrame(flat_rows)
    # convert obvious date columns
    for c in ["last_scraped", "calendar_last_scraped", "first_review", "last_review"]:
        if c in df:
            df[c] = pd.to_datetime(df[c], errors="coerce", utc=True)

    columns = [profile_series(c, df[c], n) for c in df.columns]

    coord_df = pd.DataFrame(coord_rows)
    geo = {}
    if not coord_df.empty:
        geo = {
            "lat": numeric_stats(coord_df["latitude"]),
            "lon": numeric_stats(coord_df["longitude"]),
            "listings_with_coords": int(len(coord_df)),
        }

    # duplicate detection
    dup_id = int(df["_id"].duplicated().sum()) if "_id" in df else 0
    dup_url = int(df["listing_url"].duplicated().sum()) if "listing_url" in df else 0

    aser = pd.Series(amenities_per_listing)
    rser = pd.Series(reviews_per_listing)
    return {
        "name": "MongoDB Sample Airbnb (listingsAndReviews.json)",
        "role": "PRIMARY",
        "rows": n,
        "top_level_columns": len(df.columns),
        "columns": columns,
        "geo": geo,
        "duplicates": {"by_id": dup_id, "by_listing_url": dup_url},
        "amenities": {
            "distinct": len(amenities_counter),
            "total_assignments": int(sum(amenities_counter.values())),
            "per_listing": {
                "min": int(aser.min()), "median": float(aser.median()),
                "mean": round(float(aser.mean()), 2), "max": int(aser.max()),
            },
            "top": amenities_counter.most_common(30),
        },
        "host_verifications": {
            "distinct": len(verif_counter),
            "top": verif_counter.most_common(20),
        },
        "reviews": {
            "total": total_reviews,
            "per_listing": {
                "min": int(rser.min()), "median": float(rser.median()),
                "mean": round(float(rser.mean()), 2), "max": int(rser.max()),
                "listings_with_zero": int((rser == 0).sum()),
            },
            "comment_len_sampled": {
                "mean": round(float(np.mean(review_comment_lengths)), 1) if review_comment_lengths else 0,
                "max": int(np.max(review_comment_lengths)) if review_comment_lengths else 0,
            },
        },
        "images": dict(images_nonempty),
    }


# --------------------------------------------------------------------------- #
# Dataset 2 — Kaggle CSV
# --------------------------------------------------------------------------- #
def profile_kaggle() -> dict:
    df = pd.read_csv(CSV_PATH, dtype=str, keep_default_na=True, low_memory=False)
    n = len(df)
    columns = [profile_series(c, df[c], n) for c in df.columns]
    # duplicates
    dup_full = int(df.duplicated().sum())
    dup_id = int(df["id"].duplicated().sum()) if "id" in df else None
    dup_business = int(df.duplicated(subset=[c for c in ["NAME", "host id", "lat", "long"] if c in df]).sum())
    return {
        "name": "Kaggle Airbnb Open Data (Airbnb_Open_Data.csv)",
        "role": "SECONDARY",
        "rows": n,
        "top_level_columns": len(df.columns),
        "columns": columns,
        "duplicates": {
            "full_row": dup_full,
            "by_id": dup_id,
            "by_name_host_latlong": dup_business,
        },
    }


# --------------------------------------------------------------------------- #
# Markdown rendering
# --------------------------------------------------------------------------- #
def _col_table(columns: list[dict]) -> list[str]:
    out = ["| Column | PG type | Non-null | Null % | Distinct | Notes |",
           "|---|---|---:|---:|---:|---|"]
    for c in columns:
        if "date" in c:
            note = f"range {c['date']['min']} → {c['date']['max']}"
        elif "numeric" in c and c["numeric"]:
            s = c["numeric"]
            note = f"min={s['min']}, med={s['median']}, mean={s['mean']}, max={s['max']}, outliers(IQR)={s['outliers_iqr']}"
        else:
            tv = c.get("top_values", [])[:3]
            note = "; ".join(f"{v}({n})" for v, n in tv)
        out.append(f"| `{c['column']}` | {c['pg_type']} | {c['non_null']} | {c['null_pct']} | {c['distinct']} | {note} |")
    return out


def render_markdown(mongo: dict, kaggle: dict) -> str:
    L: list[str] = []
    ap = L.append
    ap("# StayLens — Data Profiling Report")
    ap("")
    ap(f"_Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} by `scripts/profile_data.py`._")
    ap("")
    ap("Two independent Airbnb datasets are profiled below. **They are NOT merged** — "
       "there is no reliable shared identifier (different id spaces, cities, and time periods). "
       "Dataset 1 is the primary property source; Dataset 2 is used for analytics enrichment only.")
    ap("")
    ap("## 0. Overview")
    ap("")
    ap("| # | Dataset | File | Format | Rows | Top-level columns | Role |")
    ap("|---|---|---|---|---:|---:|---|")
    ap(f"| 1 | MongoDB Sample Airbnb | `listingsAndReviews.json` | NDJSON (Extended JSON v2) | {mongo['rows']:,} | {mongo['top_level_columns']} | **PRIMARY** |")
    ap(f"| 2 | Kaggle Airbnb Open Data | `Airbnb_Open_Data.csv` | CSV | {kaggle['rows']:,} | {kaggle['top_level_columns']} | SECONDARY |")
    ap("")

    # ---- Dataset 1 ----
    ap("---")
    ap("")
    ap("## 1. Dataset 1 — MongoDB Sample Airbnb (PRIMARY)")
    ap("")
    ap(f"- **Records:** {mongo['rows']:,} listings (one NDJSON object per line)")
    ap(f"- **Encoding:** MongoDB Extended JSON v2 (`$oid`, `$date`, `$numberInt`, `$numberDecimal`, `$numberDouble`)")
    ap(f"- **Duplicates:** by `_id` = {mongo['duplicates']['by_id']}, by `listing_url` = {mongo['duplicates']['by_listing_url']}")
    ap("")
    ap("### 1.1 Flattened scalar fields (top-level + nested objects)")
    ap("")
    ap("Nested objects `host{}`, `address{}`, `availability{}`, `review_scores{}`, `images{}` are "
       "flattened with dotted names. Arrays and geo are profiled separately below.")
    ap("")
    L.extend(_col_table(mongo["columns"]))
    ap("")

    ap("### 1.2 Nested JSON objects")
    ap("")
    ap("| Object | Fields | Target treatment |")
    ap("|---|---|---|")
    ap("| `host{}` | 16 fields (host_id, host_name, response_rate, superhost, verifications[], …) | Normalized into **`hosts`** table |")
    ap("| `address{}` | street, suburb, government_area, market, country, country_code, location | Columns on **`properties`** (+ lat/lng) |")
    ap("| `address.location{}` | GeoJSON Point → `coordinates:[lon, lat]`, is_location_exact | `longitude`, `latitude` DOUBLE PRECISION |")
    ap("| `availability{}` | availability_30/60/90/365 | Columns on **`properties`** |")
    ap("| `review_scores{}` | 7 sub-scores + rating | Columns on **`properties`** |")
    ap("| `images{}` | thumbnail/medium/picture/xl_picture_url | **`property_images`** table |")
    ap("")

    ap("### 1.3 Arrays")
    ap("")
    am = mongo["amenities"]
    ap(f"**`amenities[]`** — {am['distinct']} distinct amenities across {am['total_assignments']:,} assignments; "
       f"per listing min={am['per_listing']['min']}, median={am['per_listing']['median']}, "
       f"mean={am['per_listing']['mean']}, max={am['per_listing']['max']}.")
    ap("")
    ap("Top 30 amenities:")
    ap("")
    ap("| Amenity | Listings | Amenity | Listings |")
    ap("|---|---:|---|---:|")
    top = am["top"]
    half = (len(top) + 1) // 2
    for i in range(half):
        l = top[i]
        r = top[i + half] if i + half < len(top) else ("", "")
        ap(f"| {l[0]} | {l[1]} | {r[0]} | {r[1]} |")
    ap("")
    hv = mongo["host_verifications"]
    ap(f"**`host.host_verifications[]`** — {hv['distinct']} distinct: " +
       ", ".join(f"`{v}` ({c})" for v, c in hv["top"]))
    ap("")
    rv = mongo["reviews"]
    ap(f"**`reviews[]`** (embedded) — {rv['total']:,} total reviews; per listing "
       f"min={rv['per_listing']['min']}, median={rv['per_listing']['median']}, "
       f"mean={rv['per_listing']['mean']}, max={rv['per_listing']['max']}; "
       f"{rv['per_listing']['listings_with_zero']:,} listings have zero reviews. "
       f"Sampled comment length mean={rv['comment_len_sampled']['mean']} chars, "
       f"max={rv['comment_len_sampled']['max']}. → Normalized into **`reviews`** table.")
    ap("")

    ap("### 1.4 Image fields")
    ap("")
    ap("| Field | Non-empty listings |")
    ap("|---|---:|")
    for f in ("thumbnail_url", "medium_url", "picture_url", "xl_picture_url"):
        ap(f"| `images.{f}` | {mongo['images'].get(f, 0):,} |")
    ap("")

    ap("### 1.5 Geo distribution")
    ap("")
    if mongo["geo"]:
        g = mongo["geo"]
        ap(f"- Listings with coordinates: **{g['listings_with_coords']:,}**")
        ap(f"- Latitude:  min={g['lat']['min']}, median={g['lat']['median']}, max={g['lat']['max']}")
        ap(f"- Longitude: min={g['lon']['min']}, median={g['lon']['median']}, max={g['lon']['max']}")
    ap("")

    # ---- Dataset 2 ----
    ap("---")
    ap("")
    ap("## 2. Dataset 2 — Kaggle Airbnb Open Data (SECONDARY)")
    ap("")
    ap(f"- **Rows:** {kaggle['rows']:,}")
    ap(f"- **Duplicates:** full-row = {kaggle['duplicates']['full_row']:,}, "
       f"by `id` = {kaggle['duplicates']['by_id']}, "
       f"by (NAME+host id+lat+long) = {kaggle['duplicates']['by_name_host_latlong']:,}")
    ap("")
    ap("### 2.1 Column profile")
    ap("")
    L.extend(_col_table(kaggle["columns"]))
    ap("")
    ap("### 2.2 Known dirtiness (to be handled in ETL Phase 3)")
    ap("")
    ap("- `price`, `service fee` — currency strings like `\"$966 \"` (leading `$`, trailing space, thousands `,`) → parse to `NUMERIC`.")
    ap("- `instant_bookable` — `TRUE`/`FALSE` strings → `BOOLEAN`.")
    ap("- `last review` — `M/D/YYYY` strings → `DATE`.")
    ap("- `reviews per month`, `review rate number` — numeric but stored as text.")
    ap("- Column names contain spaces/mixed case → snake_case on load.")
    ap("- `neighbourhood group` has known typos (e.g. `brookln`, `manhatan`) → normalize.")
    ap("")

    # ---- Recommended indexes ----
    ap("---")
    ap("")
    ap("## 3. Recommended indexes (consolidated)")
    ap("")
    ap("```text")
    ap("properties(host_id)                      -- FK lookups")
    ap("properties(room_type), (property_type)   -- facet filters")
    ap("properties(country_code, market)         -- geo facet filters")
    ap("properties(price)                        -- range filter / sort")
    ap("properties USING gist (ll_to_earth(latitude, longitude))  -- geo radius (earthdistance) ")
    ap("properties USING gin (to_tsvector('english', name || ' ' || description))  -- keyword search")
    ap("property_images(property_id)")
    ap("property_amenities(property_id), (amenity_id)   -- composite PK + reverse")
    ap("reviews(property_id), (reviewer_id), (review_date)")
    ap("favorites(user_id, property_id) UNIQUE")
    ap("bookmarks(user_id, property_id) UNIQUE")
    ap("embeddings USING hnsw (embedding vector_cosine_ops)  -- semantic search")
    ap("```")
    ap("")
    ap("## 4. Cross-dataset policy")
    ap("")
    ap("The two datasets share **no reliable join key** — Dataset 1 uses Airbnb room ids in a "
       "global set of cities (Porto, Istanbul, Hong Kong, NYC, Sydney, …) scraped ~2019, while "
       "Dataset 2 is NYC-centric with its own `id` space and 2021–2022 review dates. They are kept "
       "in **separate tables / marts**. Any future linkage must go through a high-confidence match "
       "(name + geohash + host), never a blind concat.")
    ap("")
    return "\n".join(L)


def _json_default(o):
    if isinstance(o, (Decimal,)):
        return float(o)
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    return str(o)


def main():
    os.makedirs(LOG_DIR, exist_ok=True)
    print("Profiling Dataset 1 (MongoDB JSON)…")
    mongo = profile_mongo()
    print(f"  {mongo['rows']:,} listings, {mongo['reviews']['total']:,} reviews")
    print("Profiling Dataset 2 (Kaggle CSV)…")
    kaggle = profile_kaggle()
    print(f"  {kaggle['rows']:,} rows")

    md = render_markdown(mongo, kaggle)
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write(md)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump({"mongo": mongo, "kaggle": kaggle}, f, indent=2, default=_json_default)
    print(f"\nWrote {OUT_MD}")
    print(f"Wrote {OUT_JSON}")


if __name__ == "__main__":
    main()
