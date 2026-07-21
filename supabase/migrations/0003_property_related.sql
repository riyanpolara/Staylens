-- ============================================================================
-- StayLens · Migration 0003 · Property-related tables
-- images · amenities · property_amenities · reviews
-- ============================================================================

-- ===========================================================================
-- property_images — gallery (from images{} + future multi-image support)
-- ===========================================================================
create table if not exists property_images (
    id           uuid primary key default gen_random_uuid(),
    property_id  uuid not null references properties (id) on delete cascade,
    url          text not null,
    image_type   text not null default 'picture',   -- thumbnail|medium|picture|xl_picture
    caption      text,
    sort_order   smallint not null default 0,
    is_primary   boolean not null default false,
    width        integer,
    height       integer,
    created_at   timestamptz not null default now(),
    constraint image_type_valid check (image_type in
        ('thumbnail', 'medium', 'picture', 'xl_picture', 'user_upload'))
);
comment on table property_images is 'Ordered image gallery per property. is_primary marks the cover photo.';

-- exactly one primary image per property
create unique index if not exists uq_property_primary_image
    on property_images (property_id) where is_primary;

-- ===========================================================================
-- amenities — canonical amenity dictionary (~186 distinct)
-- ===========================================================================
create table if not exists amenities (
    id         uuid primary key default gen_random_uuid(),
    name       text not null unique,       -- 'Wifi', 'Kitchen', ...
    slug       text not null unique,       -- 'wifi', 'kitchen', ...
    category   text,                        -- optional grouping (safety, kitchen, ...)
    created_at timestamptz not null default now()
);
comment on table amenities is 'Canonical, de-duplicated amenity dictionary.';

-- ===========================================================================
-- property_amenities — M:N join
-- ===========================================================================
create table if not exists property_amenities (
    property_id uuid not null references properties (id) on delete cascade,
    amenity_id  uuid not null references amenities (id)  on delete cascade,
    primary key (property_id, amenity_id)
);
comment on table property_amenities is 'Many-to-many between properties and amenities.';

-- ===========================================================================
-- reviews — normalized from the embedded reviews[] array (~150k rows)
-- ===========================================================================
create table if not exists reviews (
    id                uuid primary key default gen_random_uuid(),
    property_id       uuid not null references properties (id) on delete cascade,
    source            data_source_enum not null default 'mongodb_airbnb',
    source_review_id  text,                        -- Airbnb review id
    reviewer_source_id text,                       -- Airbnb reviewer id
    reviewer_name     text,
    review_date       date,
    comments          text,
    -- optional link to an app user who authored a review in-product (future)
    author_user_id    uuid references profiles (id) on delete set null,
    created_at        timestamptz not null default now(),
    constraint reviews_source_uk unique (source, source_review_id)
);
comment on table reviews is 'Guest reviews (primary: embedded MongoDB reviews[]).';
