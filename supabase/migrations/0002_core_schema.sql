-- ============================================================================
-- StayLens · Migration 0002 · Core schema (profiles, hosts, properties)
-- ----------------------------------------------------------------------------
-- Production-normalized model derived from the MongoDB Sample Airbnb dataset
-- (the PRIMARY source). UUID primary keys everywhere; natural source ids are
-- retained as UNIQUE columns so ETL is idempotent and re-runnable.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enumerated types (stable, low-cardinality domains)
-- ---------------------------------------------------------------------------
do $$ begin
    create type room_type_enum as enum (
        'Entire home/apt', 'Private room', 'Shared room', 'Hotel room'
    );
exception when duplicate_object then null; end $$;

do $$ begin
    create type data_source_enum as enum ('mongodb_airbnb', 'kaggle_open_data', 'user_generated');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ===========================================================================
-- profiles — 1:1 extension of Supabase auth.users (app-level user data)
-- ===========================================================================
create table if not exists profiles (
    id            uuid primary key references auth.users (id) on delete cascade,
    username      text unique,
    full_name     text,
    avatar_url    text,
    bio           text,
    home_currency char(3) default 'USD',
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    constraint username_len check (username is null or char_length(username) between 3 and 40)
);
comment on table profiles is 'Application profile per authenticated user (extends auth.users).';

create trigger trg_profiles_updated
    before update on profiles
    for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, avatar_url)
    values (new.id,
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'avatar_url')
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();

-- ===========================================================================
-- hosts — normalized from the embedded host{} object
-- ===========================================================================
create table if not exists hosts (
    id                      uuid primary key default gen_random_uuid(),
    source                  data_source_enum not null default 'mongodb_airbnb',
    source_host_id          text not null,                 -- Airbnb host id (natural key)
    name                    text,
    location                text,
    about                   text,
    response_time           text,                          -- 'within an hour' ...
    response_rate           smallint,                      -- percentage 0..100
    acceptance_rate         smallint,
    thumbnail_url           text,
    picture_url             text,
    neighbourhood           text,
    is_superhost            boolean not null default false,
    has_profile_pic         boolean not null default false,
    identity_verified       boolean not null default false,
    listings_count          integer,
    total_listings_count    integer,
    verifications           text[] not null default '{}',  -- ['phone','email',...]
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now(),
    constraint hosts_source_uk unique (source, source_host_id),
    constraint response_rate_range check (response_rate is null or response_rate between 0 and 100),
    constraint acceptance_rate_range check (acceptance_rate is null or acceptance_rate between 0 and 100)
);
comment on table hosts is 'Airbnb hosts, one row per (source, source_host_id).';
comment on column hosts.verifications is 'Identity verification methods, e.g. {phone,email,government_id}.';

create trigger trg_hosts_updated
    before update on hosts
    for each row execute function set_updated_at();

-- ===========================================================================
-- properties — the central listing table
-- ===========================================================================
create table if not exists properties (
    id                      uuid primary key default gen_random_uuid(),
    source                  data_source_enum not null default 'mongodb_airbnb',
    source_id               text not null,                 -- Airbnb room id (_id)
    host_id                 uuid references hosts (id) on delete set null,
    listing_url             text,

    -- descriptive / semantic text (fuel for embeddings & keyword search)
    name                    text not null,
    summary                 text,
    space                   text,
    description             text,
    neighborhood_overview   text,
    notes                   text,
    transit                 text,
    access                  text,
    interaction             text,
    house_rules             text,

    -- categorical
    property_type           text,
    room_type               room_type_enum,
    bed_type                text,
    cancellation_policy     text,

    -- capacity
    accommodates            smallint,
    bedrooms                smallint,
    beds                    smallint,
    bathrooms               numeric(4,1),
    guests_included         smallint,
    minimum_nights          integer,
    maximum_nights          integer,

    -- pricing (normalized to numeric; currency tracked explicitly)
    currency                char(3) not null default 'USD',
    price                   numeric(10,2),
    weekly_price            numeric(10,2),
    monthly_price           numeric(10,2),
    security_deposit        numeric(10,2),
    cleaning_fee            numeric(10,2),
    extra_people            numeric(10,2),

    -- availability snapshot
    availability_30         smallint,
    availability_60         smallint,
    availability_90         smallint,
    availability_365        smallint,

    -- review roll-ups (embedded reviews are normalized into `reviews`)
    number_of_reviews       integer not null default 0,
    reviews_per_month       numeric(6,2),
    first_review            date,
    last_review             date,
    review_scores_rating        smallint,   -- 0..100
    review_scores_accuracy      smallint,   -- 0..10
    review_scores_cleanliness   smallint,
    review_scores_checkin       smallint,
    review_scores_communication smallint,
    review_scores_location      smallint,
    review_scores_value         smallint,

    -- location / address
    street                  text,
    suburb                  text,
    government_area         text,
    market                  text,
    city                    text,
    country                 text,
    country_code            char(2),
    latitude                double precision,
    longitude               double precision,
    is_location_exact       boolean,

    -- housekeeping
    last_scraped            date,
    is_active               boolean not null default true,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now(),

    constraint properties_source_uk unique (source, source_id),
    constraint price_non_negative  check (price is null or price >= 0),
    constraint accommodates_pos    check (accommodates is null or accommodates >= 0),
    constraint nights_valid        check (minimum_nights is null or maximum_nights is null
                                          or maximum_nights >= minimum_nights),
    constraint lat_range           check (latitude is null or latitude between -90 and 90),
    constraint lon_range           check (longitude is null or longitude between -180 and 180),
    constraint rating_range        check (review_scores_rating is null
                                          or review_scores_rating between 0 and 100)
);
comment on table properties is 'Vacation rental listings (primary: MongoDB Sample Airbnb).';
comment on column properties.source_id is 'Natural Airbnb room id; UNIQUE per source for idempotent ETL.';
comment on column properties.currency is 'ISO-4217 code; prices are stored in this currency.';

create trigger trg_properties_updated
    before update on properties
    for each row execute function set_updated_at();
