-- ============================================================================
-- StayLens · Migration 0010 · Normalized cities (non-destructive)
-- ----------------------------------------------------------------------------
-- Adds a `cities` dimension and a nullable `properties.city_id` FK. Existing
-- city/country columns are RETAINED for backward compatibility (dropped later,
-- once the app reads city_id). Also registers the new 'inside_airbnb' source.
-- Nothing is dropped or recreated.
-- ============================================================================

-- New data source for the Inside Airbnb import (safe: not used in this tx).
alter type data_source_enum add value if not exists 'inside_airbnb';

-- ---------------------------------------------------------------------------
-- cities dimension (expanded for future: continent search, local time/currency)
-- ---------------------------------------------------------------------------
create table if not exists cities (
    id             uuid primary key default gen_random_uuid(),
    city_name      text not null,
    state          text,
    country        text,
    continent      text,
    latitude       double precision,   -- centroid (avg of member properties)
    longitude      double precision,
    timezone       text,               -- IANA tz, e.g. 'Europe/Berlin'
    currency       char(3),            -- local ISO-4217, e.g. 'EUR'
    source_dataset text,               -- contributing dataset(s)
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);
comment on table cities is 'Normalized city dimension across all datasets (dedup by city_name+country).';

-- One row per (city_name, country), case-insensitive.
create unique index if not exists uq_cities_name_country
    on cities (lower(city_name), lower(coalesce(country, '')));
create index if not exists idx_cities_country   on cities (country);
create index if not exists idx_cities_continent on cities (continent);

drop trigger if exists trg_cities_updated on cities;
create trigger trg_cities_updated
    before update on cities
    for each row execute function set_updated_at();

alter table cities enable row level security;
drop policy if exists "catalog: public read cities" on cities;
create policy "catalog: public read cities" on cities for select using (true);

-- ---------------------------------------------------------------------------
-- properties.city_id  (nullable FK; existing city/country columns kept)
-- ---------------------------------------------------------------------------
alter table properties
    add column if not exists city_id uuid references cities (id) on delete set null;
create index if not exists idx_properties_city_id on properties (city_id);
comment on column properties.city_id is 'FK → cities. city/country columns kept temporarily for back-compat.';
