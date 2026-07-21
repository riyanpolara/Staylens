"""ETL for the six Inside Airbnb city datasets → schema-aligned CSVs.

Reads data_insideairbnb/<City, State, Country>/{listings,reviews}.csv/*.csv and
writes clean CSVs to data/clean/insideairbnb/ plus cities_ia.json (city identity
for the cities dimension). All rows carry source='inside_airbnb' with
deterministic UUIDv5 keys NAMESPACED BY SOURCE so they never collide with the
existing MongoDB catalog. Prices are converted to USD; review scores are
rescaled from Inside Airbnb's 0–5 to the catalog's 0–100 / 0–10.

Run:  python scripts/clean_insideairbnb.py
"""
from __future__ import annotations

import ast
import csv
import json
import os
import re
from collections import Counter

from lib import cleaners as C
from lib import enrichment as E

csv.field_size_limit(10**9)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "data_insideairbnb")
OUT_DIR = os.path.join(ROOT, "data", "clean", "insideairbnb")
SOURCE = "inside_airbnb"

# property columns = same as catalog + city_id (matches import order)
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
             "is_location_exact", "last_scraped", "is_active", "city_id"]
HOST_COLS = ["id", "source", "source_host_id", "name", "location", "about",
             "response_time", "response_rate", "acceptance_rate", "thumbnail_url",
             "picture_url", "neighbourhood", "is_superhost", "has_profile_pic",
             "identity_verified", "listings_count", "total_listings_count",
             "verifications"]
IMAGE_COLS = ["id", "property_id", "url", "image_type", "sort_order", "is_primary"]
AMEN_COLS = ["id", "name", "slug", "category"]
REVIEW_COLS = ["id", "property_id", "source", "source_review_id",
               "reviewer_source_id", "reviewer_name", "review_date", "comments"]


def b(v):
    return "" if v is None else ("true" if v else "false")


def s(v):
    return "" if v is None else v


def row(d, cols):
    return [b(d[c]) if isinstance(d.get(c), bool) else s(d.get(c)) for c in cols]


def parse_list(raw):
    """Inside Airbnb amenities/verifications: JSON or python-literal list string."""
    raw = (raw or "").strip()
    if not raw or raw in ("[]", "{}"):
        return []
    try:
        v = json.loads(raw)
    except Exception:
        try:
            v = ast.literal_eval(raw)
        except Exception:
            return []
    return [str(x) for x in v] if isinstance(v, (list, tuple)) else []


_BATH_NUM = re.compile(r"([0-9]+(?:\.[0-9]+)?)")


def parse_bathrooms(bathrooms, bathrooms_text):
    v = C.parse_decimal(bathrooms, places=1)
    if v is not None:
        return v
    t = (bathrooms_text or "").strip().lower()
    if not t:
        return None
    if "half" in t and not _BATH_NUM.search(t):
        return 0.5
    m = _BATH_NUM.search(t)
    return round(float(m.group(1)), 1) if m else None


def parse_city_folder(name):
    parts = [p.strip() for p in name.split(",")]
    city = parts[0]
    country = parts[-1] if len(parts) > 1 else None
    state = ", ".join(parts[1:-1]) if len(parts) > 2 else None
    return city, state, country


def rescale_rating(v):      # 0–5 → 0–100
    f = C.parse_decimal(v, places=2)
    return round(f * 20) if f is not None else None


def rescale_sub(v):         # 0–5 → 0–10
    f = C.parse_decimal(v, places=2)
    return round(f * 2) if f is not None else None


def run():
    os.makedirs(OUT_DIR, exist_ok=True)
    hosts, amenities = {}, {}
    counts = Counter()
    cities = []

    fp_prop = open(os.path.join(OUT_DIR, "properties.csv"), "w", newline="", encoding="utf-8")
    fp_img = open(os.path.join(OUT_DIR, "property_images.csv"), "w", newline="", encoding="utf-8")
    fp_pa = open(os.path.join(OUT_DIR, "property_amenities.csv"), "w", newline="", encoding="utf-8")
    fp_rev = open(os.path.join(OUT_DIR, "reviews.csv"), "w", newline="", encoding="utf-8")
    w_prop = csv.writer(fp_prop); w_prop.writerow(PROP_COLS)
    w_img = csv.writer(fp_img); w_img.writerow(IMAGE_COLS)
    w_pa = csv.writer(fp_pa); w_pa.writerow(["property_id", "amenity_id"])
    w_rev = csv.writer(fp_rev); w_rev.writerow(REVIEW_COLS)

    for folder in sorted(os.listdir(SRC_DIR)):
        fdir = os.path.join(SRC_DIR, folder)
        if not os.path.isdir(fdir):
            continue
        city_name, state, country = parse_city_folder(folder)
        ckey = E.city_key(city_name, country)
        city_id = C.det_uuid("city", ckey)
        local_ccy = E.currency_for(city_name, country) or "USD"
        ccode = E.country_code_for(country)
        clat = clng = 0.0
        cn = 0
        cities.append({"key": ckey, "city_name": city_name, "state": state,
                       "country": country})

        lp = os.path.join(fdir, "listings.csv", "listings.csv")
        with open(lp, encoding="utf-8", newline="") as f:
            for rec in csv.DictReader(f):
                sid = C.clean_text(rec.get("id"))
                if not sid:
                    continue
                counts["properties"] += 1
                puid = C.det_uuid("prop", SOURCE, sid)

                # host
                hsid = C.clean_text(rec.get("host_id"))
                huid = None
                if hsid:
                    huid = C.det_uuid("host", SOURCE, hsid)
                    if hsid not in hosts:
                        hosts[hsid] = {
                            "id": huid, "source": SOURCE, "source_host_id": hsid,
                            "name": C.collapse_ws(rec.get("host_name")),
                            "location": C.collapse_ws(rec.get("host_location")),
                            "about": C.clean_text(rec.get("host_about")),
                            "response_time": C.clean_text(rec.get("host_response_time")),
                            "response_rate": C.parse_percent(rec.get("host_response_rate")),
                            "acceptance_rate": C.parse_percent(rec.get("host_acceptance_rate")),
                            "thumbnail_url": C.clean_text(rec.get("host_thumbnail_url")),
                            "picture_url": C.clean_text(rec.get("host_picture_url")),
                            "neighbourhood": C.clean_text(rec.get("host_neighbourhood")),
                            "is_superhost": C.parse_bool(rec.get("host_is_superhost")) or False,
                            "has_profile_pic": C.parse_bool(rec.get("host_has_profile_pic")) or False,
                            "identity_verified": C.parse_bool(rec.get("host_identity_verified")) or False,
                            "listings_count": C.parse_int(rec.get("host_listings_count"), lo=0),
                            "total_listings_count": C.parse_int(rec.get("host_total_listings_count"), lo=0),
                            "verifications": C.pg_array(parse_list(rec.get("host_verifications"))),
                        }

                lat = _f(rec.get("latitude")); lng = _f(rec.get("longitude"))
                if lat is not None and lng is not None:
                    clat += lat; clng += lng; cn += 1
                price = C.to_usd(C.parse_money(rec.get("price")), local_ccy)

                prop = {
                    "id": puid, "source": SOURCE, "source_id": sid, "host_id": huid,
                    "listing_url": C.clean_text(rec.get("listing_url")),
                    "name": C.collapse_ws(rec.get("name")) or "(untitled)",
                    "summary": None, "space": None,
                    "description": C.clean_text(rec.get("description")),
                    "neighborhood_overview": C.clean_text(rec.get("neighborhood_overview")),
                    "notes": None, "transit": None, "access": None,
                    "interaction": None, "house_rules": None,
                    "property_type": C.clean_text(rec.get("property_type")),
                    "room_type": C.normalize_room_type(rec.get("room_type")),
                    "bed_type": None, "cancellation_policy": None,
                    "accommodates": C.parse_int(rec.get("accommodates"), lo=0),
                    "bedrooms": C.parse_int(rec.get("bedrooms"), lo=0),
                    "beds": C.parse_int(rec.get("beds"), lo=0),
                    "bathrooms": parse_bathrooms(rec.get("bathrooms"), rec.get("bathrooms_text")),
                    "guests_included": None,
                    "minimum_nights": (min_n := C.parse_int(rec.get("minimum_nights"), lo=0, hi=100000)),
                    # some IA listings carry max < min (e.g. 31/30) → null the max
                    "maximum_nights": (max_n if (max_n := C.parse_int(rec.get("maximum_nights"), lo=0, hi=100000)) is None
                                       or min_n is None or max_n >= min_n else None),
                    "currency": "USD", "price": price,
                    "weekly_price": None, "monthly_price": None,
                    "security_deposit": None, "cleaning_fee": None, "extra_people": None,
                    "availability_30": C.parse_int(rec.get("availability_30")),
                    "availability_60": C.parse_int(rec.get("availability_60")),
                    "availability_90": C.parse_int(rec.get("availability_90")),
                    "availability_365": C.parse_int(rec.get("availability_365")),
                    "number_of_reviews": C.parse_int(rec.get("number_of_reviews"), lo=0) or 0,
                    "reviews_per_month": C.parse_decimal(rec.get("reviews_per_month"), places=2),
                    "first_review": C.to_date(rec.get("first_review")),
                    "last_review": C.to_date(rec.get("last_review")),
                    "review_scores_rating": rescale_rating(rec.get("review_scores_rating")),
                    "review_scores_accuracy": rescale_sub(rec.get("review_scores_accuracy")),
                    "review_scores_cleanliness": rescale_sub(rec.get("review_scores_cleanliness")),
                    "review_scores_checkin": rescale_sub(rec.get("review_scores_checkin")),
                    "review_scores_communication": rescale_sub(rec.get("review_scores_communication")),
                    "review_scores_location": rescale_sub(rec.get("review_scores_location")),
                    "review_scores_value": rescale_sub(rec.get("review_scores_value")),
                    "street": None,
                    "suburb": C.clean_text(rec.get("neighbourhood")),
                    "government_area": C.clean_text(rec.get("neighbourhood_cleansed"))
                                      or C.clean_text(rec.get("neighbourhood_group_cleansed")),
                    "market": city_name, "city": city_name, "country": country,
                    "country_code": ccode, "latitude": lat, "longitude": lng,
                    "is_location_exact": None,
                    "last_scraped": C.to_date(rec.get("last_scraped")),
                    "is_active": True, "city_id": city_id,
                }
                w_prop.writerow(row(prop, PROP_COLS))

                # image
                url = C.clean_text(rec.get("picture_url"))
                if url:
                    w_img.writerow([C.det_uuid("img", SOURCE, sid, "picture"), puid,
                                    url, "picture", 0, "true"])
                    counts["images"] += 1

                # amenities
                seen = set()
                for a in parse_list(rec.get("amenities")):
                    nm = C.collapse_ws(a)
                    slug = C.slugify(nm) if nm else None
                    if not slug or slug in seen:
                        continue
                    seen.add(slug)
                    if slug not in amenities:
                        amenities[slug] = {"id": C.det_uuid("amenity", slug),
                                           "name": nm, "slug": slug, "category": None}
                    w_pa.writerow([puid, amenities[slug]["id"]])
                    counts["property_amenities"] += 1

        # reviews (streamed)
        rp = os.path.join(fdir, "reviews.csv", "reviews.csv")
        if os.path.isfile(rp):
            with open(rp, encoding="utf-8", newline="") as f:
                for rv in csv.DictReader(f):
                    lid = C.clean_text(rv.get("listing_id"))
                    rid = C.clean_text(rv.get("id"))
                    if not lid:
                        continue
                    w_rev.writerow([
                        C.det_uuid("review", SOURCE, rid) if rid else C.det_uuid("review", SOURCE, lid, counts["reviews"]),
                        C.det_uuid("prop", SOURCE, lid), SOURCE, rid,
                        C.clean_text(rv.get("reviewer_id")),
                        C.collapse_ws(rv.get("reviewer_name")),
                        C.to_date(rv.get("date")),
                        C.clean_text(rv.get("comments")),
                    ])
                    counts["reviews"] += 1

        # finalize city centroid
        cities[-1]["latitude"] = round(clat / cn, 6) if cn else None
        cities[-1]["longitude"] = round(clng / cn, 6) if cn else None
        cities[-1]["n_listings"] = cn
        print(f"  {folder:40} listings so far, city centroid n={cn}")

    with open(os.path.join(OUT_DIR, "hosts.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(HOST_COLS)
        for h in hosts.values():
            w.writerow(row(h, HOST_COLS))
    with open(os.path.join(OUT_DIR, "amenities.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(AMEN_COLS)
        for a in amenities.values():
            w.writerow(row(a, AMEN_COLS))
    with open(os.path.join(OUT_DIR, "cities_ia.json"), "w", encoding="utf-8") as f:
        json.dump(cities, f, indent=2)

    for fp in (fp_prop, fp_img, fp_pa, fp_rev):
        fp.close()
    counts["hosts"] = len(hosts)
    counts["amenities"] = len(amenities)
    return dict(counts)


def _f(v):
    try:
        return round(float(str(v).strip()), 6) if str(v).strip() else None
    except (ValueError, TypeError):
        return None


if __name__ == "__main__":
    print("Inside Airbnb ETL…")
    r = run()
    print("Done:")
    for k in ("properties", "hosts", "amenities", "property_amenities", "images", "reviews"):
        print(f"  {k:20} {r.get(k, 0):>12,}")
