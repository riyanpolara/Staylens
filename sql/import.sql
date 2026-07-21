-- ============================================================================
-- StayLens · Phase 5 · psql import script (\copy, client-side)
-- ----------------------------------------------------------------------------
-- Loads the clean CSVs with the psql \copy meta-command (no superuser needed).
-- Run from the project root:
--
--     psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f sql/import.sql
--
-- \copy streams the local file to the server, so paths are relative to where
-- psql is launched (the repo root).
-- ============================================================================

\set ON_ERROR_STOP on
begin;

-- Full refresh: clear existing rows. CASCADE also clears embeddings/favorites/
-- bookmarks/bookings. Loading below is in FK-safe order (no trigger disabling
-- needed — that would require superuser on Supabase).
truncate table reviews, property_amenities, property_images,
               properties, hosts, amenities,
               analytics.kaggle_listings cascade;

-- Load in FK-safe order -------------------------------------------------------
\copy amenities (id,name,slug,category) from 'data/clean/amenities.csv' with (format csv, header true, null '')

\copy hosts (id,source,source_host_id,name,location,about,response_time,response_rate,thumbnail_url,picture_url,neighbourhood,is_superhost,has_profile_pic,identity_verified,listings_count,total_listings_count,verifications) from 'data/clean/hosts.csv' with (format csv, header true, null '')

\copy properties from 'data/clean/properties.csv' with (format csv, header true, null '')

\copy property_images (id,property_id,url,image_type,sort_order,is_primary) from 'data/clean/property_images.csv' with (format csv, header true, null '')

\copy property_amenities (property_id,amenity_id) from 'data/clean/property_amenities.csv' with (format csv, header true, null '')

\copy reviews (id,property_id,source,source_review_id,reviewer_source_id,reviewer_name,review_date,comments) from 'data/clean/reviews.csv' with (format csv, header true, null '')

\copy analytics.kaggle_listings from 'data/clean/kaggle_listings.csv' with (format csv, header true, null '')

-- Refresh planner stats after a big load.
analyze;

commit;

\echo 'Import complete. Run sql/verification.sql to validate.'
