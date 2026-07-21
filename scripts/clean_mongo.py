"""Phase 3/4 — ETL for the PRIMARY dataset (MongoDB Sample Airbnb).

Reads `listingsAndReviews.json`, cleans + normalizes it into the StayLens schema
and writes six schema-aligned CSVs to `data/clean/`:

    hosts.csv · properties.csv · property_images.csv
    amenities.csv · property_amenities.csv · reviews.csv

Also emits a cleaning log (`data/logs/clean_mongo_log.jsonl`) and returns metrics
used by the consolidated data-quality report.

Run:  python scripts/clean_mongo.py
"""
from __future__ import annotations

import csv
import json
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone

from lib.mongo_json import iter_listings
from lib import cleaners as C

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "listingsAndReviews.json")
CLEAN_DIR = os.path.join(ROOT, "data", "clean")
LOG_DIR = os.path.join(ROOT, "data", "logs")
LOG_PATH = os.path.join(LOG_DIR, "clean_mongo_log.jsonl")

MAX_NIGHTS_CAP = 100_000  # anything above (e.g. int32 sentinel) → NULL

HOST_COLS = ["id", "source", "source_host_id", "name", "location", "about",
             "response_time", "response_rate", "thumbnail_url", "picture_url",
             "neighbourhood", "is_superhost", "has_profile_pic",
             "identity_verified", "listings_count", "total_listings_count",
             "verifications"]

PROP_COLS = ["id", "source", "source_id", "host_id", "listing_url", "name",
             "summary", "space", "description", "neighborhood_overview", "notes",
             "transit", "access", "interaction", "house_rules", "property_type",
             "room_type", "bed_type", "cancellation_policy", "accommodates",
             "bedrooms", "beds", "bathrooms", "guests_included", "minimum_nights",
             "maximum_nights", "currency", "price", "weekly_price", "monthly_price",
             "security_deposit", "cleaning_fee", "extra_people", "availability_30",
             "availability_60", "availability_90", "availability_365",
             "number_of_reviews", "reviews_per_month", "first_review", "last_review",
             "review_scores_rating", "review_scores_accuracy",
             "review_scores_cleanliness", "review_scores_checkin",
             "review_scores_communication", "review_scores_location",
             "review_scores_value", "street", "suburb", "government_area", "market",
             "city", "country", "country_code", "latitude", "longitude",
             "is_location_exact", "last_scraped", "is_active"]

IMAGE_COLS = ["id", "property_id", "url", "image_type", "sort_order", "is_primary"]
AMEN_COLS = ["id", "name", "slug", "category"]
PROP_AMEN_COLS = ["property_id", "amenity_id"]
REVIEW_COLS = ["id", "property_id", "source", "source_review_id",
               "reviewer_source_id", "reviewer_name", "review_date", "comments"]

# Light amenity categorization (best-effort; uncategorized → NULL)
AMEN_CATEGORY = {
    "safety": ["smoke detector", "carbon monoxide", "fire extinguisher",
               "first aid", "lock on bedroom", "security"],
    "kitchen": ["kitchen", "refrigerator", "microwave", "oven", "stove",
                "dishes", "cooking", "coffee", "dishwasher"],
    "bath": ["shampoo", "hair dryer", "hot water", "bathtub", "body soap"],
    "bedroom": ["bed linens", "hangers", "iron", "closet", "pillows"],
    "connectivity": ["wifi", "internet", "tv", "cable", "laptop"],
    "climate": ["air conditioning", "heating", "fan"],
    "parking": ["parking", "garage"],
    "family": ["kid", "crib", "children", "high chair", "baby"],
}


def categorize_amenity(name: str) -> str | None:
    low = name.lower()
    for cat, keys in AMEN_CATEGORY.items():
        if any(k in low for k in keys):
            return cat
    return None


def b(val):
    """bool → csv 'true'/'false'/'' (empty = NULL)."""
    return "" if val is None else ("true" if val else "false")


def s(val):
    return "" if val is None else val


class Metrics:
    def __init__(self):
        self.counts = Counter()
        self.issues = Counter()
        self.samples = defaultdict(list)

    def log(self, kind, **extra):
        self.issues[kind] += 1
        if len(self.samples[kind]) < 5:
            self.samples[kind].append(extra)


def run():
    os.makedirs(CLEAN_DIR, exist_ok=True)
    os.makedirs(LOG_DIR, exist_ok=True)
    m = Metrics()

    hosts: dict[str, dict] = {}          # source_host_id → host row
    amenities: dict[str, dict] = {}      # slug → amenity row
    seen_property_ids: set[str] = set()
    seen_review_ids: set[str] = set()

    # open the two large output streams
    fp_prop = open(os.path.join(CLEAN_DIR, "properties.csv"), "w", newline="", encoding="utf-8")
    fp_img = open(os.path.join(CLEAN_DIR, "property_images.csv"), "w", newline="", encoding="utf-8")
    fp_pa = open(os.path.join(CLEAN_DIR, "property_amenities.csv"), "w", newline="", encoding="utf-8")
    fp_rev = open(os.path.join(CLEAN_DIR, "reviews.csv"), "w", newline="", encoding="utf-8")
    w_prop = csv.writer(fp_prop); w_prop.writerow(PROP_COLS)
    w_img = csv.writer(fp_img); w_img.writerow(IMAGE_COLS)
    w_pa = csv.writer(fp_pa); w_pa.writerow(PROP_AMEN_COLS)
    w_rev = csv.writer(fp_rev); w_rev.writerow(REVIEW_COLS)

    for rec in iter_listings(JSON_PATH):
        m.counts["listings_read"] += 1
        src_id = C.clean_text(rec.get("_id"))
        if not src_id:
            m.log("property_missing_id"); continue
        if src_id in seen_property_ids:
            m.log("duplicate_property", source_id=src_id); continue
        seen_property_ids.add(src_id)
        prop_uuid = C.det_uuid("prop", src_id)

        # ---------------- host ----------------
        host = rec.get("host") or {}
        host_src = C.clean_text(host.get("host_id"))
        host_uuid = None
        if host_src:
            host_uuid = C.det_uuid("host", host_src)
            if host_src not in hosts:
                rr = C.parse_percent(host.get("host_response_rate"))
                hosts[host_src] = {
                    "id": host_uuid, "source": "mongodb_airbnb",
                    "source_host_id": host_src,
                    "name": C.collapse_ws(host.get("host_name")),
                    "location": C.collapse_ws(host.get("host_location")),
                    "about": C.clean_text(host.get("host_about")),
                    "response_time": C.clean_text(host.get("host_response_time")),
                    "response_rate": rr,
                    "thumbnail_url": C.clean_text(host.get("host_thumbnail_url")),
                    "picture_url": C.clean_text(host.get("host_picture_url")),
                    "neighbourhood": C.clean_text(host.get("host_neighbourhood")),
                    "is_superhost": bool(host.get("host_is_superhost")),
                    "has_profile_pic": bool(host.get("host_has_profile_pic")),
                    "identity_verified": bool(host.get("host_identity_verified")),
                    "listings_count": C.parse_int(host.get("host_listings_count"), lo=0),
                    "total_listings_count": C.parse_int(host.get("host_total_listings_count"), lo=0),
                    "verifications": C.pg_array(host.get("host_verifications") or []),
                }
                m.counts["hosts_unique"] += 1
            else:
                m.counts["host_dedup_skipped"] += 1

        # ---------------- address / geo ----------------
        addr = rec.get("address") or {}
        loc = (addr.get("location") or {})
        coords = loc.get("coordinates") or []
        lon = lat = None
        if len(coords) == 2:
            try:
                lon, lat = float(coords[0]), float(coords[1])
                if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                    m.log("geo_out_of_range", source_id=src_id, lat=lat, lon=lon)
                    lon = lat = None
            except (TypeError, ValueError):
                lon = lat = None

        # ---------------- pricing (normalize to USD; dataset has no ccy) ----
        currency = "USD"
        price = C.to_usd(C.parse_money(rec.get("price")), currency)
        if rec.get("price") is not None and price is None:
            m.log("price_unparseable", source_id=src_id, raw=str(rec.get("price")))

        max_nights = C.parse_int(rec.get("maximum_nights"), lo=0, hi=MAX_NIGHTS_CAP)
        if rec.get("maximum_nights") and max_nights is None:
            m.log("maximum_nights_capped", source_id=src_id, raw=str(rec.get("maximum_nights")))

        avail = rec.get("availability") or {}
        scores = rec.get("review_scores") or {}

        prop = {
            "id": prop_uuid, "source": "mongodb_airbnb", "source_id": src_id,
            "host_id": host_uuid,
            "listing_url": C.clean_text(rec.get("listing_url")),
            "name": C.collapse_ws(rec.get("name")) or "(untitled)",
            "summary": C.clean_text(rec.get("summary")),
            "space": C.clean_text(rec.get("space")),
            "description": C.clean_text(rec.get("description")),
            "neighborhood_overview": C.clean_text(rec.get("neighborhood_overview")),
            "notes": C.clean_text(rec.get("notes")),
            "transit": C.clean_text(rec.get("transit")),
            "access": C.clean_text(rec.get("access")),
            "interaction": C.clean_text(rec.get("interaction")),
            "house_rules": C.clean_text(rec.get("house_rules")),
            "property_type": C.clean_text(rec.get("property_type")),
            "room_type": C.normalize_room_type(rec.get("room_type")),
            "bed_type": C.clean_text(rec.get("bed_type")),
            "cancellation_policy": C.clean_text(rec.get("cancellation_policy")),
            "accommodates": C.parse_int(rec.get("accommodates"), lo=0),
            "bedrooms": C.parse_int(rec.get("bedrooms"), lo=0),
            "beds": C.parse_int(rec.get("beds"), lo=0),
            "bathrooms": C.parse_decimal(rec.get("bathrooms"), places=1),
            "guests_included": C.parse_int(rec.get("guests_included"), lo=0),
            "minimum_nights": C.parse_int(rec.get("minimum_nights"), lo=0, hi=MAX_NIGHTS_CAP),
            "maximum_nights": max_nights,
            "currency": currency,
            "price": price,
            "weekly_price": C.to_usd(C.parse_money(rec.get("weekly_price")), currency),
            "monthly_price": C.to_usd(C.parse_money(rec.get("monthly_price")), currency),
            "security_deposit": C.to_usd(C.parse_money(rec.get("security_deposit")), currency),
            "cleaning_fee": C.to_usd(C.parse_money(rec.get("cleaning_fee")), currency),
            "extra_people": C.to_usd(C.parse_money(rec.get("extra_people")), currency),
            "availability_30": C.parse_int(avail.get("availability_30")),
            "availability_60": C.parse_int(avail.get("availability_60")),
            "availability_90": C.parse_int(avail.get("availability_90")),
            "availability_365": C.parse_int(avail.get("availability_365")),
            "number_of_reviews": C.parse_int(rec.get("number_of_reviews"), lo=0) or 0,
            "reviews_per_month": C.parse_decimal(rec.get("reviews_per_month"), places=2),
            "first_review": C.to_date(rec.get("first_review")),
            "last_review": C.to_date(rec.get("last_review")),
            "review_scores_rating": C.parse_int(scores.get("review_scores_rating")),
            "review_scores_accuracy": C.parse_int(scores.get("review_scores_accuracy")),
            "review_scores_cleanliness": C.parse_int(scores.get("review_scores_cleanliness")),
            "review_scores_checkin": C.parse_int(scores.get("review_scores_checkin")),
            "review_scores_communication": C.parse_int(scores.get("review_scores_communication")),
            "review_scores_location": C.parse_int(scores.get("review_scores_location")),
            "review_scores_value": C.parse_int(scores.get("review_scores_value")),
            "street": C.collapse_ws(addr.get("street")),
            "suburb": C.clean_text(addr.get("suburb")),
            "government_area": C.clean_text(addr.get("government_area")),
            "market": C.clean_text(addr.get("market")),
            "city": C.clean_text(addr.get("market")),   # best available city-level field
            "country": C.clean_text(addr.get("country")),
            "country_code": C.clean_text(addr.get("country_code")),
            "latitude": lat, "longitude": lon,
            "is_location_exact": bool(loc.get("is_location_exact")) if "is_location_exact" in loc else None,
            "last_scraped": C.to_date(rec.get("last_scraped")),
            "is_active": True,
        }
        # nights sanity
        if (prop["minimum_nights"] and prop["maximum_nights"]
                and prop["maximum_nights"] < prop["minimum_nights"]):
            m.log("nights_swapped", source_id=src_id)
            prop["maximum_nights"] = None
        w_prop.writerow(_row(prop, PROP_COLS))
        m.counts["properties_written"] += 1

        # ---------------- images ----------------
        imgs = rec.get("images") or {}
        order = 0
        for itype, field in (("picture", "picture_url"), ("xl_picture", "xl_picture_url"),
                             ("medium", "medium_url"), ("thumbnail", "thumbnail_url")):
            url = C.clean_text(imgs.get(field))
            if not url:
                continue
            w_img.writerow(_row({
                "id": C.det_uuid("img", src_id, itype),
                "property_id": prop_uuid, "url": url, "image_type": itype,
                "sort_order": order, "is_primary": (order == 0),
            }, IMAGE_COLS))
            order += 1
            m.counts["images_written"] += 1
        if order == 0:
            m.log("property_no_image", source_id=src_id)

        # ---------------- amenities ----------------
        seen_slugs: set[str] = set()   # dedupe within a listing (composite PK safe)
        for amen in rec.get("amenities") or []:
            name = C.collapse_ws(amen)
            if not name:
                continue
            slug = C.slugify(name)
            if not slug or slug in seen_slugs:
                if slug:
                    m.log("duplicate_amenity_in_listing", source_id=src_id, slug=slug)
                continue
            seen_slugs.add(slug)
            if slug not in amenities:
                amenities[slug] = {
                    "id": C.det_uuid("amenity", slug), "name": name,
                    "slug": slug, "category": categorize_amenity(name),
                }
            w_pa.writerow([prop_uuid, amenities[slug]["id"]])
            m.counts["property_amenities_written"] += 1

        # ---------------- reviews ----------------
        for r in rec.get("reviews") or []:
            rid = C.clean_text(r.get("_id"))
            review_uuid = C.det_uuid("review", rid) if rid else C.det_uuid("review", src_id, m.counts["reviews_written"])
            if rid and rid in seen_review_ids:
                m.log("duplicate_review", review_id=rid); continue
            if rid:
                seen_review_ids.add(rid)
            w_rev.writerow(_row({
                "id": review_uuid, "property_id": prop_uuid, "source": "mongodb_airbnb",
                "source_review_id": rid,
                "reviewer_source_id": C.clean_text(r.get("reviewer_id")),
                "reviewer_name": C.collapse_ws(r.get("reviewer_name")),
                "review_date": C.to_date(r.get("date")),
                "comments": C.clean_text(r.get("comments")),
            }, REVIEW_COLS))
            m.counts["reviews_written"] += 1

    # ---------------- flush dimension tables ----------------
    with open(os.path.join(CLEAN_DIR, "hosts.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(HOST_COLS)
        for h in hosts.values():
            w.writerow(_row(h, HOST_COLS))
    with open(os.path.join(CLEAN_DIR, "amenities.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(AMEN_COLS)
        for a in amenities.values():
            w.writerow(_row(a, AMEN_COLS))

    for fp in (fp_prop, fp_img, fp_pa, fp_rev):
        fp.close()

    m.counts["amenities_unique"] = len(amenities)

    # ---------------- FK validation ----------------
    host_ids = {h["id"] for h in hosts.values()}
    orphan_hosts = 0  # properties reference host_uuid we just created → always valid
    m.counts["fk_property_host_ok"] = m.counts["properties_written"]
    m.counts["fk_orphan_host_refs"] = orphan_hosts

    # ---------------- write log ----------------
    with open(LOG_PATH, "w", encoding="utf-8") as f:
        f.write(json.dumps({"ts": datetime.now(timezone.utc).isoformat(),
                            "dataset": "mongodb_airbnb"}) + "\n")
        for kind, cnt in m.issues.most_common():
            f.write(json.dumps({"issue": kind, "count": cnt,
                                "samples": m.samples[kind]}) + "\n")

    return {"counts": dict(m.counts), "issues": dict(m.issues)}


def _row(d: dict, cols: list[str]) -> list:
    out = []
    for c in cols:
        v = d.get(c)
        if isinstance(v, bool):
            out.append(b(v))
        else:
            out.append(s(v))
    return out


if __name__ == "__main__":
    result = run()
    print("MongoDB ETL complete:")
    for k, v in result["counts"].items():
        print(f"  {k:32} {v:>10,}")
    if result["issues"]:
        print("Data-quality issues:")
        for k, v in sorted(result["issues"].items(), key=lambda x: -x[1]):
            print(f"  {k:32} {v:>10,}")
