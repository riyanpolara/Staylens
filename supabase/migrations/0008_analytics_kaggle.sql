-- ============================================================================
-- StayLens · Migration 0008 · Analytics mart (SECONDARY dataset)
-- ----------------------------------------------------------------------------
-- The Kaggle Airbnb Open Data is kept PHYSICALLY SEPARATE from the normalized
-- catalog (no merge). It lives in its own `analytics` schema and is used for
-- market-level insight only, never joined to `properties` by id.
-- ============================================================================

create schema if not exists analytics;
comment on schema analytics is 'Secondary / analytics-only data (Kaggle Open Data). Never merged into public.';

create table if not exists analytics.kaggle_listings (
    id                          bigint primary key,        -- Kaggle id (own id space)
    name                        text,
    host_id                     bigint,
    host_identity_verified      boolean,
    host_name                   text,
    neighbourhood_group         text,
    neighbourhood               text,
    latitude                    double precision,
    longitude                   double precision,
    country                     text,
    country_code                char(2),
    instant_bookable            boolean,
    cancellation_policy         text,
    room_type                   text,
    construction_year           smallint,
    price                       numeric(10,2),             -- parsed from "$966 "
    service_fee                 numeric(10,2),
    minimum_nights              integer,
    number_of_reviews           integer,
    last_review                 date,
    reviews_per_month           numeric(6,2),
    review_rate_number          smallint,
    calculated_host_listings    integer,
    availability_365            integer,
    house_rules                 text,
    license                     text,
    loaded_at                   timestamptz not null default now()
);
comment on table analytics.kaggle_listings is
    'Cleaned Kaggle Airbnb Open Data (NYC-centric). Analytics only — do NOT join to public.properties.';

create index if not exists idx_kaggle_neigh_group on analytics.kaggle_listings (neighbourhood_group);
create index if not exists idx_kaggle_room_type   on analytics.kaggle_listings (room_type);
create index if not exists idx_kaggle_price       on analytics.kaggle_listings (price);
