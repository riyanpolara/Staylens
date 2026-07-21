-- ============================================================================
-- StayLens · Migration 0005 · Indexes
-- ----------------------------------------------------------------------------
-- Chosen from the Phase-1 profiling report: FK joins, facet filters, price
-- range/sort, geo-radius, fuzzy + full-text search.
-- ============================================================================

-- --- Foreign-key / join support -------------------------------------------
create index if not exists idx_properties_host_id       on properties (host_id);
create index if not exists idx_property_images_property on property_images (property_id);
create index if not exists idx_prop_amen_amenity        on property_amenities (amenity_id);
create index if not exists idx_reviews_property_id      on reviews (property_id);
create index if not exists idx_reviews_reviewer         on reviews (reviewer_source_id);
create index if not exists idx_reviews_date             on reviews (review_date desc);

-- --- Facet filters (discovery / search UI) --------------------------------
create index if not exists idx_properties_room_type     on properties (room_type);
create index if not exists idx_properties_property_type on properties (property_type);
create index if not exists idx_properties_market        on properties (country_code, market);
create index if not exists idx_properties_active        on properties (is_active) where is_active;

-- --- Price range filter + sort --------------------------------------------
create index if not exists idx_properties_price         on properties (price);
create index if not exists idx_properties_accommodates  on properties (accommodates);

-- --- Geo radius search (earthdistance; ll_to_earth is IMMUTABLE) -----------
create index if not exists idx_properties_geo
    on properties using gist (extensions.ll_to_earth(latitude, longitude))
    where latitude is not null and longitude is not null;

-- --- Fuzzy name matching (pg_trgm) ----------------------------------------
create index if not exists idx_properties_name_trgm
    on properties using gin (name extensions.gin_trgm_ops);

-- --- Full-text keyword search over the descriptive text -------------------
create index if not exists idx_properties_fts
    on properties using gin (
        to_tsvector('english',
            coalesce(name, '') || ' ' ||
            coalesce(summary, '') || ' ' ||
            coalesce(space, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(neighborhood_overview, ''))
    );

-- --- Engagement lookups ----------------------------------------------------
create index if not exists idx_favorites_user  on favorites (user_id);
create index if not exists idx_bookmarks_user  on bookmarks (user_id, collection);
create index if not exists idx_chat_msgs_session on chat_messages (session_id, created_at);
create index if not exists idx_bookings_property on bookings (property_id, check_in);
create index if not exists idx_bookings_guest    on bookings (guest_id);
