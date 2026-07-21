-- ============================================================================
-- StayLens · Migration 0004 · Engagement & product tables
-- favorites · bookmarks · chat (AI) · bookings (future)
-- ============================================================================

-- ===========================================================================
-- favorites — a user "hearts" a property (lightweight)
-- ===========================================================================
create table if not exists favorites (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references profiles (id) on delete cascade,
    property_id uuid not null references properties (id) on delete cascade,
    created_at  timestamptz not null default now(),
    constraint favorites_uk unique (user_id, property_id)
);
comment on table favorites is 'User → property favorites (one heart per pair).';

-- ===========================================================================
-- bookmarks — saved for planning; supports named collections + notes
-- ===========================================================================
create table if not exists bookmarks (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references profiles (id) on delete cascade,
    property_id uuid not null references properties (id) on delete cascade,
    collection  text not null default 'default',   -- e.g. 'Summer Italy trip'
    note        text,
    created_at  timestamptz not null default now(),
    constraint bookmarks_uk unique (user_id, property_id, collection)
);
comment on table bookmarks is 'User bookmarks for vacation planning, grouped into collections.';

-- ===========================================================================
-- AI Chat — conversation sessions + messages (Claude-powered assistant)
-- ===========================================================================
create table if not exists chat_sessions (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references profiles (id) on delete cascade,
    title       text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
comment on table chat_sessions is 'AI chat conversations owned by a user.';

create trigger trg_chat_sessions_updated
    before update on chat_sessions
    for each row execute function set_updated_at();

create table if not exists chat_messages (
    id           uuid primary key default gen_random_uuid(),
    session_id   uuid not null references chat_sessions (id) on delete cascade,
    role         text not null,                       -- 'user' | 'assistant' | 'system'
    content      text not null,
    -- properties surfaced/cited by the assistant in this turn (recommendations)
    cited_property_ids uuid[] not null default '{}',
    token_count  integer,
    created_at   timestamptz not null default now(),
    constraint chat_role_valid check (role in ('user', 'assistant', 'system', 'tool'))
);
comment on table chat_messages is 'Individual turns within an AI chat session.';

-- ===========================================================================
-- bookings — FUTURE booking system (schema-ready, not yet wired to UI)
-- ===========================================================================
do $$ begin
    create type booking_status_enum as enum
        ('pending', 'confirmed', 'cancelled', 'completed', 'declined');
exception when duplicate_object then null; end $$;

create table if not exists bookings (
    id            uuid primary key default gen_random_uuid(),
    property_id   uuid not null references properties (id) on delete restrict,
    guest_id      uuid not null references profiles (id)   on delete restrict,
    check_in      date not null,
    check_out     date not null,
    guests        smallint not null default 1,
    nightly_price numeric(10,2),
    cleaning_fee  numeric(10,2),
    total_price   numeric(10,2),
    currency      char(3) not null default 'USD',
    status        booking_status_enum not null default 'pending',
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    constraint booking_dates_valid check (check_out > check_in),
    constraint booking_guests_pos  check (guests > 0)
);
comment on table bookings is 'FUTURE: reservation records. Schema present for forward compatibility.';

create trigger trg_bookings_updated
    before update on bookings
    for each row execute function set_updated_at();

-- Prevent double-booking of overlapping confirmed date ranges per property.
-- (Uses a GiST exclusion constraint over a daterange.)
create extension if not exists btree_gist with schema extensions;
alter table bookings
    add constraint no_overlapping_bookings
    exclude using gist (
        property_id with =,
        (daterange(check_in, check_out, '[)')) with &&
    ) where (status in ('confirmed', 'completed'));
