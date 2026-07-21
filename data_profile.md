# StayLens — Data Profiling Report

_Generated 2026-07-01 12:05 UTC by `scripts/profile_data.py`._

Two independent Airbnb datasets are profiled below. **They are NOT merged** — there is no reliable shared identifier (different id spaces, cities, and time periods). Dataset 1 is the primary property source; Dataset 2 is used for analytics enrichment only.

## 0. Overview

| # | Dataset | File | Format | Rows | Top-level columns | Role |
|---|---|---|---|---:|---:|---|
| 1 | MongoDB Sample Airbnb | `listingsAndReviews.json` | NDJSON (Extended JSON v2) | 5,555 | 73 | **PRIMARY** |
| 2 | Kaggle Airbnb Open Data | `Airbnb_Open_Data.csv` | CSV | 102,599 | 26 | SECONDARY |

---

## 1. Dataset 1 — MongoDB Sample Airbnb (PRIMARY)

- **Records:** 5,555 listings (one NDJSON object per line)
- **Encoding:** MongoDB Extended JSON v2 (`$oid`, `$date`, `$numberInt`, `$numberDecimal`, `$numberDouble`)
- **Duplicates:** by `_id` = 0, by `listing_url` = 0

### 1.1 Flattened scalar fields (top-level + nested objects)

Nested objects `host{}`, `address{}`, `availability{}`, `review_scores{}`, `images{}` are flattened with dotted names. Arrays and geo are profiled separately below.

| Column | PG type | Non-null | Null % | Distinct | Notes |
|---|---|---:|---:|---:|---|
| `_id` | VARCHAR(32) | 5555 | 0.0 | 5555 | 10006546(1); 10009999(1); 1001265(1) |
| `listing_url` | TEXT  -- URL | 5555 | 0.0 | 5555 | https://www.airbnb.com/rooms/10006546(1); https://www.airbnb.com/rooms/10009999(1); https://www.airbnb.com/rooms/1001265(1) |
| `name` | VARCHAR(256) | 5555 | 0.0 | 5538 | (8); İstanbul Birden fazla bölümden oluşan bina(4); Feel like home(2) |
| `summary` | TEXT | 5555 | 0.0 | 5260 | (258); Our room holds a formal license issued by the Hong Kong Gove(4); .(3) |
| `space` | TEXT | 5555 | 0.0 | 3888 | (1626); Every booking is instantly confirmed. Every call or message (14); In the traditional Chinese building, the simplicity and mode(5) |
| `description` | TEXT | 5555 | 0.0 | 5442 | (95); Urban Shadow It couldn’t be better located. Walk out of the (3); Our room is conveniently located in Hong Kong’s renowned com(2) |
| `neighborhood_overview` | TEXT | 5555 | 0.0 | 3228 | (2241); .(7); There are wonderful restaurants nearby, including the well-k(4) |
| `notes` | TEXT | 5555 | 0.0 | 2382 | (3080); .(6); In order to make Porto more attractive, the municipal touris(6) |
| `transit` | TEXT | 5555 | 0.0 | 3231 | (2232); You can request our transfer service whenever you need it (c(6); - Uber and Lyft are available in Honolulu and Waikiki - 'Bik(5) |
| `access` | TEXT | 5555 | 0.0 | 2989 | (2453); Guests have access to all the amenities of the apartment.(8); The guests have full access to the apartment.(5) |
| `interaction` | TEXT | 5555 | 0.0 | 2917 | (2478); Our concierge is available by phone, email, or Messenger 24/(14); We leave our guests at ease, but we’re available whenever th(6) |
| `house_rules` | TEXT | 5555 | 0.0 | 3113 | (2285); House Rules 1. All bookings require a security deposit of $3(14); - Smoking is not allowed inside the apartment, only in the b(10) |
| `property_type` | VARCHAR(32) | 5555 | 0.0 | 36 | Apartment(3626); House(606); Condominium(399) |
| `room_type` | TEXT  -- low-cardinality (3); enum candidate | 5555 | 0.0 | 3 | Entire home/apt(3489); Private room(1983); Shared room(83) |
| `bed_type` | TEXT  -- low-cardinality (5); enum candidate | 5555 | 0.0 | 5 | Real Bed(5506); Pull-out Sofa(26); Futon(10) |
| `minimum_nights` | VARCHAR(32) | 5555 | 0.0 | 45 | min=1.0, med=2.0, mean=5.5644, max=1250.0, outliers(IQR)=679 |
| `maximum_nights` | VARCHAR(32) | 5555 | 0.0 | 140 | min=1.0, med=1125.0, mean=1382776.3201, max=2147483647.0, outliers(IQR)=10 |
| `cancellation_policy` | TEXT  -- low-cardinality (5); enum candidate | 5555 | 0.0 | 5 | strict_14_with_grace_period(2420); flexible(1682); moderate(1336) |
| `last_scraped` | TIMESTAMPTZ | 5555 | 0.0 | 7 | range 2019-02-11 → 2019-03-11 |
| `calendar_last_scraped` | TIMESTAMPTZ | 5555 | 0.0 | 7 | range 2019-02-11 → 2019-03-11 |
| `first_review` | TIMESTAMPTZ | 4167 | 24.99 | 1686 | range 2009-10-27 → 2019-03-10 |
| `last_review` | TIMESTAMPTZ | 4167 | 24.99 | 809 | range 2012-01-06 → 2019-03-11 |
| `accommodates` | INTEGER | 5555 | 0.0 | 16 | min=1.0, med=3.0, mean=3.5059, max=16.0, outliers(IQR)=369 |
| `bedrooms` | NUMERIC | 5550 | 0.09 | 13 | min=0.0, med=1.0, mean=1.4117, max=20.0, outliers(IQR)=229 |
| `beds` | NUMERIC | 5542 | 0.23 | 19 | min=0.0, med=2.0, mean=2.0715, max=25.0, outliers(IQR)=115 |
| `number_of_reviews` | INTEGER | 5555 | 0.0 | 259 | min=0.0, med=5.0, mean=27.6065, max=533.0, outliers(IQR)=633 |
| `bathrooms` | NUMERIC | 5545 | 0.18 | 17 | min=0.0, med=1.0, mean=1.2912, max=16.0, outliers(IQR)=1343 |
| `price` | NUMERIC(10,2) | 5555 | 0.0 | 649 | min=9.0, med=129.0, mean=278.7662, max=48842.0, outliers(IQR)=570 |
| `security_deposit` | NUMERIC(10,2) | 3471 | 37.52 | 213 | min=0.0, med=200.0, mean=509.4304, max=39228.0, outliers(IQR)=249 |
| `cleaning_fee` | NUMERIC(10,2) | 4024 | 27.56 | 291 | min=0.0, med=60.0, mean=94.0748, max=2000.0, outliers(IQR)=235 |
| `extra_people` | NUMERIC(10,2) | 5555 | 0.0 | 138 | min=0.0, med=0.0, mean=22.7919, max=2346.0, outliers(IQR)=543 |
| `guests_included` | NUMERIC | 5555 | 0.0 | 14 | min=1.0, med=1.0, mean=1.7474, max=16.0, outliers(IQR)=640 |
| `images.thumbnail_url` | TEXT  -- URL | 5555 | 0.0 | 1 | (5555) |
| `images.medium_url` | TEXT  -- URL | 5555 | 0.0 | 1 | (5555) |
| `images.picture_url` | TEXT  -- URL | 5555 | 0.0 | 5553 | https://a0.muscache.com/im/pictures/e811747d-5d49-49cb-a99c-(2); https://a0.muscache.com/im/pictures/cb4b5903-68da-4ecb-b18b-(2); https://a0.muscache.com/im/pictures/15037101/5aff14a7_origin(1) |
| `images.xl_picture_url` | TEXT  -- URL | 5555 | 0.0 | 1 | (5555) |
| `host.host_id` | VARCHAR(32) | 5555 | 0.0 | 5104 | 97240131(18); 12243051(11); 38459934(9) |
| `host.host_url` | TEXT  -- URL | 5555 | 0.0 | 5104 | https://www.airbnb.com/users/show/97240131(18); https://www.airbnb.com/users/show/12243051(11); https://www.airbnb.com/users/show/38459934(9) |
| `host.host_name` | VARCHAR(64) | 5555 | 0.0 | 3140 | Maria(37); David(26); Ana(21) |
| `host.host_location` | VARCHAR(128) | 5555 | 0.0 | 676 | New York, New York, United States(483); Barcelona, Catalonia, Spain(407); Montreal, Quebec, Canada(331) |
| `host.host_about` | TEXT | 5555 | 0.0 | 2950 | (2219); Welcome to Hong Kong !
If you choose to stay with me, well,(18); Sonder provides everything you need for an exceptional stay.(11) |
| `host.host_response_time` | TEXT  -- low-cardinality (4); enum candidate | 4167 | 24.99 | 4 | within an hour(2715); within a few hours(742); within a day(566) |
| `host.host_thumbnail_url` | TEXT  -- URL | 5555 | 0.0 | 5086 | https://a0.muscache.com/defaults/user_pic-50x50.png?v=3(19); https://a0.muscache.com/im/pictures/user/990e64c5-5755-4207-(18); https://a0.muscache.com/im/pictures/user/c92b0b12-e019-4bb1-(11) |
| `host.host_picture_url` | TEXT  -- URL | 5555 | 0.0 | 5086 | https://a0.muscache.com/defaults/user_pic-225x225.png?v=3(19); https://a0.muscache.com/im/pictures/user/990e64c5-5755-4207-(18); https://a0.muscache.com/im/pictures/user/c92b0b12-e019-4bb1-(11) |
| `host.host_neighbourhood` | VARCHAR(64) | 5555 | 0.0 | 447 | (1923); Copacabana(124); Le Plateau(123) |
| `host.host_response_rate` | NUMERIC | 4167 | 24.99 | 62 | min=0.0, med=100.0, mean=93.1183, max=100.0, outliers(IQR)=883 |
| `host.host_is_superhost` | BOOLEAN | 5555 | 0.0 | 2 | False(4465); True(1090) |
| `host.host_has_profile_pic` | BOOLEAN | 5555 | 0.0 | 2 | True(5536); False(19) |
| `host.host_identity_verified` | BOOLEAN | 5555 | 0.0 | 2 | False(3548); True(2007) |
| `host.host_listings_count` | INTEGER | 5555 | 0.0 | 132 | min=0.0, med=2.0, mean=14.4058, max=1198.0, outliers(IQR)=802 |
| `host.host_total_listings_count` | INTEGER | 5555 | 0.0 | 132 | min=0.0, med=2.0, mean=14.4058, max=1198.0, outliers(IQR)=802 |
| `address.street` | VARCHAR(96) | 5555 | 0.0 | 677 | Montréal, Québec, Canada(492); Barcelona, Catalunya, Spain(427); Porto, Porto, Portugal(351) |
| `address.suburb` | VARCHAR(64) | 5555 | 0.0 | 410 | (887); Copacabana(154); Manhattan(148) |
| `address.government_area` | VARCHAR(64) | 5555 | 0.0 | 418 | Cedofeita, Ildefonso, Sé, Miragaia, Nicolau, Vitória(275); Yau Tsim Mong(223); Beyoglu(189) |
| `address.market` | TEXT  -- low-cardinality (15); enum candidate | 5555 | 0.0 | 15 | Istanbul(660); Montreal(648); Barcelona(632) |
| `address.country` | TEXT  -- low-cardinality (9); enum candidate | 5555 | 0.0 | 9 | United States(1222); Turkey(661); Canada(649) |
| `address.country_code` | TEXT  -- low-cardinality (9); enum candidate | 5555 | 0.0 | 9 | US(1222); TR(661); CA(649) |
| `address.location.type` | TEXT  -- low-cardinality (1); enum candidate | 5555 | 0.0 | 1 | Point(5555) |
| `address.location.is_location_exact` | BOOLEAN | 5555 | 0.0 | 2 | True(3735); False(1820) |
| `availability.availability_30` | INTEGER | 5555 | 0.0 | 31 | min=0.0, med=8.0, mean=11.8162, max=30.0, outliers(IQR)=0 |
| `availability.availability_60` | INTEGER | 5555 | 0.0 | 61 | min=0.0, med=23.0, mean=26.4513, max=60.0, outliers(IQR)=0 |
| `availability.availability_90` | INTEGER | 5555 | 0.0 | 91 | min=0.0, med=43.0, mean=42.7581, max=90.0, outliers(IQR)=0 |
| `availability.availability_365` | INTEGER | 5555 | 0.0 | 366 | min=0.0, med=171.0, mean=173.1057, max=365.0, outliers(IQR)=0 |
| `review_scores.review_scores_accuracy` | NUMERIC | 4079 | 26.57 | 9 | min=2.0, med=10.0, mean=9.5575, max=10.0, outliers(IQR)=87 |
| `review_scores.review_scores_cleanliness` | NUMERIC | 4082 | 26.52 | 8 | min=2.0, med=10.0, mean=9.3153, max=10.0, outliers(IQR)=185 |
| `review_scores.review_scores_checkin` | NUMERIC | 4080 | 26.55 | 9 | min=2.0, med=10.0, mean=9.6993, max=10.0, outliers(IQR)=833 |
| `review_scores.review_scores_communication` | NUMERIC | 4081 | 26.53 | 9 | min=2.0, med=10.0, mean=9.6883, max=10.0, outliers(IQR)=870 |
| `review_scores.review_scores_location` | NUMERIC | 4081 | 26.53 | 8 | min=2.0, med=10.0, mean=9.6011, max=10.0, outliers(IQR)=53 |
| `review_scores.review_scores_value` | NUMERIC | 4080 | 26.55 | 9 | min=2.0, med=9.0, mean=9.3051, max=10.0, outliers(IQR)=126 |
| `review_scores.review_scores_rating` | NUMERIC | 4081 | 26.53 | 41 | min=20.0, med=95.0, mean=93.0992, max=100.0, outliers(IQR)=151 |
| `weekly_price` | NUMERIC(10,2) | 714 | 87.15 | 323 | min=60.0, med=800.0, mean=1530.9034, max=59123.0, outliers(IQR)=71 |
| `monthly_price` | NUMERIC(10,2) | 656 | 88.19 | 309 | min=250.0, med=2800.0, mean=5391.3704, max=253384.0, outliers(IQR)=80 |
| `reviews_per_month` | NUMERIC | 94 | 98.31 | 8 | min=1.0, med=1.0, mean=1.7128, max=10.0, outliers(IQR)=6 |

### 1.2 Nested JSON objects

| Object | Fields | Target treatment |
|---|---|---|
| `host{}` | 16 fields (host_id, host_name, response_rate, superhost, verifications[], …) | Normalized into **`hosts`** table |
| `address{}` | street, suburb, government_area, market, country, country_code, location | Columns on **`properties`** (+ lat/lng) |
| `address.location{}` | GeoJSON Point → `coordinates:[lon, lat]`, is_location_exact | `longitude`, `latitude` DOUBLE PRECISION |
| `availability{}` | availability_30/60/90/365 | Columns on **`properties`** |
| `review_scores{}` | 7 sub-scores + rating | Columns on **`properties`** |
| `images{}` | thumbnail/medium/picture/xl_picture_url | **`property_images`** table |

### 1.3 Arrays

**`amenities[]`** — 186 distinct amenities across 121,402 assignments; per listing min=1, median=20.0, mean=21.85, max=76.

Top 30 amenities:

| Amenity | Listings | Amenity | Listings |
|---|---:|---|---:|
| Wifi | 5303 | Dryer | 2381 |
| Essentials | 5048 | Elevator | 2342 |
| Kitchen | 4951 | Fire extinguisher | 2207 |
| TV | 4295 | Refrigerator | 1884 |
| Hangers | 4226 | Internet | 1815 |
| Hair dryer | 3900 | First aid kit | 1803 |
| Washer | 3877 | Bed linens | 1756 |
| Shampoo | 3709 | Cable TV | 1735 |
| Iron | 3692 | Dishes and silverware | 1717 |
| Laptop friendly workspace | 3442 | Cooking basics | 1622 |
| Air conditioning | 3431 | Microwave | 1615 |
| Heating | 3300 | Long term stays allowed | 1609 |
| Hot water | 2973 | Lock on bedroom door | 1601 |
| Smoke detector | 2886 | Stove | 1529 |
| Family/kid friendly | 2487 | Free parking on premises | 1489 |

**`host.host_verifications[]`** — 20 distinct: `phone` (5514), `email` (5211), `reviews` (4016), `government_id` (3146), `jumio` (2843), `offline_government_id` (1825), `facebook` (1131), `selfie` (1117), `identity_manual` (1048), `work_email` (721), `kba` (435), `google` (350), `manual_offline` (125), `manual_online` (36), `zhima_selfie` (27), `sesame` (14), `sesame_offline` (14), `weibo` (12), `sent_id` (8), `` (7)

**`reviews[]`** (embedded) — 149,792 total reviews; per listing min=0, median=4.0, mean=26.97, max=533; 1,632 listings have zero reviews. Sampled comment length mean=313.2 chars, max=4665. → Normalized into **`reviews`** table.

### 1.4 Image fields

| Field | Non-empty listings |
|---|---:|
| `images.thumbnail_url` | 0 |
| `images.medium_url` | 0 |
| `images.picture_url` | 5,555 |
| `images.xl_picture_url` | 0 |

### 1.5 Geo distribution

- Listings with coordinates: **5,555**
- Latitude:  min=-34.0883, median=40.7271, max=45.6656
- Longitude: min=-159.6787, median=-8.6114, max=151.339

---

## 2. Dataset 2 — Kaggle Airbnb Open Data (SECONDARY)

- **Rows:** 102,599
- **Duplicates:** full-row = 541, by `id` = 541, by (NAME+host id+lat+long) = 541

### 2.1 Column profile

| Column | PG type | Non-null | Null % | Distinct | Notes |
|---|---|---:|---:|---:|---|
| `id` | VARCHAR(32) | 102599 | 0.0 | 102058 | 20305326(2); 20305878(2); 20306430(2) |
| `NAME` | VARCHAR(256) | 102349 | 0.24 | 61281 | Home away from home(33); Hillside Hotel(30); Water View King Bed Hotel Room(30) |
| `host id` | VARCHAR(32) | 102599 | 0.0 | 102057 | 78730595133(2); 50358760342(2); 89461531863(2) |
| `host_identity_verified` | TEXT  -- low-cardinality (2); enum candidate | 102310 | 0.28 | 2 | unconfirmed(51200); verified(51110) |
| `host name` | VARCHAR(64) | 102193 | 0.4 | 13190 | Michael(881); David(764); John(581) |
| `neighbourhood group` | TEXT  -- low-cardinality (7); enum candidate | 102570 | 0.03 | 7 | Manhattan(43792); Brooklyn(41842); Queens(13267) |
| `neighbourhood` | VARCHAR(32) | 102583 | 0.02 | 224 | Bedford-Stuyvesant(7937); Williamsburg(7775); Harlem(5466) |
| `lat` | VARCHAR(32) | 102591 | 0.01 | 21991 | min=40.4998, med=40.7223, mean=40.7281, max=40.917, outliers(IQR)=916 |
| `long` | VARCHAR(32) | 102591 | 0.01 | 17774 | min=-74.2498, med=-73.9544, mean=-73.9496, max=-73.7052, outliers(IQR)=6539 |
| `country` | TEXT  -- low-cardinality (1); enum candidate | 102067 | 0.52 | 1 | United States(102067) |
| `country code` | TEXT  -- low-cardinality (1); enum candidate | 102468 | 0.13 | 1 | US(102468) |
| `instant_bookable` | BOOLEAN | 102494 | 0.1 | 2 | FALSE(51474); TRUE(51020) |
| `cancellation_policy` | TEXT  -- low-cardinality (3); enum candidate | 102523 | 0.07 | 3 | moderate(34343); strict(34106); flexible(34074) |
| `room type` | TEXT  -- low-cardinality (4); enum candidate | 102599 | 0.0 | 4 | Entire home/apt(53701); Private room(46556); Shared room(2226) |
| `Construction year` | TEXT  -- low-cardinality (20); enum candidate | 102385 | 0.21 | 20 | min=2003.0, med=2012.0, mean=2012.4875, max=2022.0, outliers(IQR)=0 |
| `price` | NUMERIC(10,2)  -- parse from currency string | 102352 | 0.24 | 1151 | $206 (137); $1,056 (132); $481 (129) |
| `service fee` | NUMERIC(10,2)  -- parse from currency string | 102326 | 0.27 | 231 | $41 (526); $216 (524); $81 (519) |
| `minimum nights` | VARCHAR(32) | 102190 | 0.4 | 153 | min=-1223.0, med=3.0, mean=8.1358, max=5645.0, outliers(IQR)=18394 |
| `number of reviews` | VARCHAR(32) | 102416 | 0.18 | 476 | min=0.0, med=7.0, mean=27.4837, max=1024.0, outliers(IQR)=11736 |
| `last review` | VARCHAR(32) | 86706 | 15.49 | 2477 | 6/23/2019(2443); 6/30/2019(2232); 7/1/2019(2218) |
| `reviews per month` | VARCHAR(32) | 86720 | 15.48 | 1016 | min=0.01, med=0.74, mean=1.374, max=90.0, outliers(IQR)=3975 |
| `review rate number` | TEXT  -- low-cardinality (5); enum candidate | 102273 | 0.32 | 5 | min=1.0, med=3.0, mean=3.2791, max=5.0, outliers(IQR)=0 |
| `calculated host listings count` | VARCHAR(32) | 102280 | 0.31 | 78 | min=1.0, med=1.0, mean=7.9366, max=332.0, outliers(IQR)=17829 |
| `availability 365` | VARCHAR(32) | 102151 | 0.44 | 438 | min=-10.0, med=96.0, mean=141.1333, max=3677.0, outliers(IQR)=1 |
| `house_rules` | TEXT | 50468 | 50.81 | 1976 | #NAME?(2712); House Rules 1. Check-in is 4 pm local time. If the unit is r(904); Please remember that this is a residential building. The bui(881) |
| `license` | TEXT  -- low-cardinality (1); enum candidate | 2 | 100.0 | 1 | 41662/AL(2) |

### 2.2 Known dirtiness (to be handled in ETL Phase 3)

- `price`, `service fee` — currency strings like `"$966 "` (leading `$`, trailing space, thousands `,`) → parse to `NUMERIC`.
- `instant_bookable` — `TRUE`/`FALSE` strings → `BOOLEAN`.
- `last review` — `M/D/YYYY` strings → `DATE`.
- `reviews per month`, `review rate number` — numeric but stored as text.
- Column names contain spaces/mixed case → snake_case on load.
- `neighbourhood group` has known typos (e.g. `brookln`, `manhatan`) → normalize.

---

## 3. Recommended indexes (consolidated)

```text
properties(host_id)                      -- FK lookups
properties(room_type), (property_type)   -- facet filters
properties(country_code, market)         -- geo facet filters
properties(price)                        -- range filter / sort
properties USING gist (ll_to_earth(latitude, longitude))  -- geo radius (earthdistance) 
properties USING gin (to_tsvector('english', name || ' ' || description))  -- keyword search
property_images(property_id)
property_amenities(property_id), (amenity_id)   -- composite PK + reverse
reviews(property_id), (reviewer_id), (review_date)
favorites(user_id, property_id) UNIQUE
bookmarks(user_id, property_id) UNIQUE
embeddings USING hnsw (embedding vector_cosine_ops)  -- semantic search
```

## 4. Cross-dataset policy

The two datasets share **no reliable join key** — Dataset 1 uses Airbnb room ids in a global set of cities (Porto, Istanbul, Hong Kong, NYC, Sydney, …) scraped ~2019, while Dataset 2 is NYC-centric with its own `id` space and 2021–2022 review dates. They are kept in **separate tables / marts**. Any future linkage must go through a high-confidence match (name + geohash + host), never a blind concat.
