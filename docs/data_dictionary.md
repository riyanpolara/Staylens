# StayLens — Data Dictionary

Schema as built by `supabase/migrations/`. All PKs are `uuid` (deterministic
UUIDv5 for imported catalog rows; `gen_random_uuid()` for app-generated rows).
Timestamps are `timestamptz` defaulting to `now()`.

Legend: **PK** primary key · **FK** foreign key · **UK** unique · **NN** not null.

---

## `public` schema (normalized catalog + product)

### cities — normalized city dimension (migration 0010)
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** (deterministic UUIDv5 from city_name+country) |
| city_name | text | **NN**; **UK**(lower(city_name), lower(country)) |
| state | text | e.g. `Texas`, `Catalonia` |
| country | text | |
| continent | text | for continent-level search |
| latitude / longitude | double precision | centroid (avg of member properties) |
| timezone | text | IANA, e.g. `Europe/Berlin` — local-time display |
| currency | char(3) | local ISO-4217, e.g. `EUR` — local-price display |
| source_dataset | text | contributing dataset(s), comma-separated |
| created_at / updated_at | timestamptz | |

_Populated from all three datasets (MongoDB, Kaggle, Inside Airbnb), deduplicated
by (city_name, country). `properties.city_id` references it; the legacy
`properties.city`/`country` text columns are retained temporarily for
backward compatibility._

### profiles — app user, 1:1 with `auth.users`
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK**, **FK** → auth.users(id) ON DELETE CASCADE |
| username | text | **UK**, 3–40 chars |
| full_name | text | |
| avatar_url | text | |
| bio | text | |
| home_currency | char(3) | default `USD` |
| created_at / updated_at | timestamptz | `updated_at` auto-maintained |

_Auto-created on signup by the `handle_new_user` trigger on `auth.users`._

### hosts — Airbnb hosts (from embedded `host{}`)
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| source | data_source_enum | default `mongodb_airbnb` |
| source_host_id | text | **NN**; **UK**(source, source_host_id) |
| name / location / about | text | |
| response_time | text | e.g. `within an hour` |
| response_rate / acceptance_rate | smallint | 0–100 (CHECK) |
| thumbnail_url / picture_url | text | |
| neighbourhood | text | |
| is_superhost / has_profile_pic / identity_verified | boolean | **NN** default false |
| listings_count / total_listings_count | integer | |
| verifications | text[] | e.g. `{phone,email,government_id}` |

### properties — central listing table
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| source | data_source_enum | default `mongodb_airbnb` |
| source_id | text | **NN**; **UK**(source, source_id) — Airbnb room id |
| host_id | uuid | **FK** → hosts(id) ON DELETE SET NULL |
| listing_url | text | |
| name | text | **NN** |
| summary, space, description, neighborhood_overview, notes, transit, access, interaction, house_rules | text | descriptive text (embedding + FTS source) |
| property_type | text | e.g. Apartment, House (36 distinct) |
| room_type | room_type_enum | Entire home/apt · Private room · Shared room · Hotel room |
| bed_type | text | |
| cancellation_policy | text | flexible/moderate/strict… (varies by source) |
| accommodates, bedrooms, beds, guests_included | smallint | |
| bathrooms | numeric(4,1) | |
| minimum_nights, maximum_nights | integer | CHECK max ≥ min |
| currency | char(3) | **NN** default USD |
| price, weekly_price, monthly_price, security_deposit, cleaning_fee, extra_people | numeric(10,2) | USD; price CHECK ≥ 0 |
| availability_30/60/90/365 | smallint | |
| number_of_reviews | integer | **NN** default 0 |
| reviews_per_month | numeric(6,2) | |
| first_review, last_review, last_scraped | date | |
| review_scores_rating | smallint | 0–100 (CHECK) |
| review_scores_accuracy/cleanliness/checkin/communication/location/value | smallint | 0–10 |
| street, suburb, government_area, market, city, country | text | |
| country_code | char(2) | |
| latitude, longitude | double precision | CHECK lat∈[-90,90], lon∈[-180,180] |
| is_location_exact | boolean | |
| is_active | boolean | **NN** default true |

### property_images — gallery
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| property_id | uuid | **NN**, **FK** → properties(id) ON DELETE CASCADE |
| url | text | **NN** |
| image_type | text | thumbnail/medium/picture/xl_picture/user_upload (CHECK) |
| caption | text | |
| sort_order | smallint | **NN** default 0 |
| is_primary | boolean | partial **UK**: one primary per property |
| width, height | integer | |

### amenities — canonical dictionary (~185)
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| name | text | **NN**, **UK** |
| slug | text | **NN**, **UK** |
| category | text | safety/kitchen/bath/… (best-effort, nullable) |

### property_amenities — M:N join
| Column | Type | Notes |
|---|---|---|
| property_id | uuid | **PK**+**FK** → properties(id) CASCADE |
| amenity_id | uuid | **PK**+**FK** → amenities(id) CASCADE |

### reviews — guest reviews (from embedded `reviews[]`)
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| property_id | uuid | **NN**, **FK** → properties(id) CASCADE |
| source | data_source_enum | default mongodb_airbnb |
| source_review_id | text | **UK**(source, source_review_id) |
| reviewer_source_id | text | Airbnb reviewer id |
| reviewer_name | text | |
| review_date | date | |
| comments | text | |
| author_user_id | uuid | **FK** → profiles(id) SET NULL (in-app reviews, future) |

### favorites / bookmarks — user engagement
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| user_id | uuid | **NN**, **FK** → profiles(id) CASCADE |
| property_id | uuid | **NN**, **FK** → properties(id) CASCADE |
| collection *(bookmarks)* | text | default `default` |
| note *(bookmarks)* | text | |
| — | — | favorites **UK**(user_id, property_id); bookmarks **UK**(user_id, property_id, collection) |

### chat_sessions / chat_messages — AI chat
| Column | Type | Notes |
|---|---|---|
| chat_sessions.id | uuid | **PK** |
| chat_sessions.user_id | uuid | **NN**, **FK** → profiles(id) CASCADE |
| chat_sessions.title | text | |
| chat_messages.id | uuid | **PK** |
| chat_messages.session_id | uuid | **NN**, **FK** → chat_sessions(id) CASCADE |
| chat_messages.role | text | user/assistant/system/tool (CHECK) |
| chat_messages.content | text | **NN** |
| chat_messages.cited_property_ids | uuid[] | properties surfaced by the assistant |
| chat_messages.token_count | integer | |

### bookings — FUTURE reservation system
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| property_id | uuid | **NN**, **FK** → properties(id) RESTRICT |
| guest_id | uuid | **NN**, **FK** → profiles(id) RESTRICT |
| check_in, check_out | date | **NN**, CHECK check_out > check_in |
| guests | smallint | **NN** default 1, CHECK > 0 |
| nightly_price, cleaning_fee, total_price | numeric(10,2) | |
| currency | char(3) | **NN** default USD |
| status | booking_status_enum | pending/confirmed/cancelled/completed/declined |
| — | — | EXCLUDE constraint blocks overlapping confirmed/completed date ranges per property |

### embeddings — semantic vectors (1:1 with property)
| Column | Type | Notes |
|---|---|---|
| id | uuid | **PK** |
| property_id | uuid | **NN**, **UK**, **FK** → properties(id) CASCADE |
| content | text | **NN** — exact text embedded |
| content_hash | text | **NN** — md5(content); skip unchanged on re-embed |
| embedding | vector(1536) | **NN**; HNSW index (cosine) |
| model | text | default `text-embedding-3-small` |

---

## `analytics` schema (SECONDARY — Kaggle, never joined to `public`)

### analytics.kaggle_listings
| Column | Type | Notes |
|---|---|---|
| id | bigint | **PK** (Kaggle id space) |
| name, host_name, neighbourhood_group, neighbourhood | text | typo-corrected |
| host_id | bigint | |
| host_identity_verified, instant_bookable | boolean | from verified/unconfirmed, TRUE/FALSE |
| latitude, longitude | double precision | |
| country, country_code | text/char(2) | |
| cancellation_policy, room_type | text | |
| construction_year | smallint | |
| price, service_fee | numeric(10,2) | parsed from `$…` strings |
| minimum_nights, number_of_reviews, calculated_host_listings, availability_365 | integer | |
| last_review | date | from `M/D/YYYY` |
| reviews_per_month | numeric(6,2) | |
| review_rate_number | smallint | 1–5 |
| house_rules, license | text | `#NAME?` Excel errors nulled |
| loaded_at | timestamptz | default now() |

---

## Enums & functions

- **room_type_enum**: `Entire home/apt`, `Private room`, `Shared room`, `Hotel room`
- **data_source_enum**: `mongodb_airbnb`, `kaggle_open_data`, `user_generated`
- **booking_status_enum**: `pending`, `confirmed`, `cancelled`, `completed`, `declined`
- **match_properties(query_embedding, match_count, similarity_threshold, filter_room_type, max_price, min_accommodates)** → semantic search
- **similar_properties(source_property_id, match_count)** → content-based recommendations
