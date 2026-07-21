-- ============================================================================
-- StayLens · ROLLBACK · drops all StayLens objects (reverse dependency order)
-- ----------------------------------------------------------------------------
-- DESTRUCTIVE. Wipes the entire StayLens schema. Intended for local/dev resets
-- and CI teardown. Does NOT touch Supabase's auth schema.
-- ============================================================================

-- functions
drop function if exists similar_properties(uuid, int);
drop function if exists match_properties(vector, int, float, room_type_enum, numeric, int);

-- analytics mart
drop schema if exists analytics cascade;

-- tables (children → parents)
drop table if exists embeddings       cascade;
drop table if exists chat_messages    cascade;
drop table if exists chat_sessions    cascade;
drop table if exists bookings         cascade;
drop table if exists bookmarks        cascade;
drop table if exists favorites        cascade;
drop table if exists reviews          cascade;
drop table if exists property_amenities cascade;
drop table if exists amenities        cascade;
drop table if exists property_images  cascade;
drop table if exists properties       cascade;
drop table if exists hosts            cascade;
drop table if exists profiles         cascade;

-- triggers on auth.users
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop function if exists set_updated_at();

-- enum types
drop type if exists booking_status_enum;
drop type if exists room_type_enum;
drop type if exists data_source_enum;

-- Note: extensions (vector, pg_trgm, ...) are intentionally left installed.
