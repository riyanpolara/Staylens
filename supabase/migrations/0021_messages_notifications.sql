-- 0021 — Messages and Notifications.
--
-- A note on hosts, because it shapes this schema:
--
-- `public.hosts` holds 5,376 catalogue records imported from Inside Airbnb.
-- They have no `auth.users` row and no way to sign in. So a conversation
-- cannot simply be (guest_id, host_id) with both sides being users — there is
-- nobody on the other end to authenticate as.
--
-- Modelled instead as:
--   guest_id        the signed-in guest            (always present)
--   host_profile_id the catalogue host they are talking to (always present)
--   host_user_id    that host's account, once one exists   (nullable today)
--
-- Nothing changes when host accounts arrive: fill in host_user_id and the
-- existing RLS policies immediately let that host read and reply. Until then a
-- guest can open a thread and send, and no reply will come — which is the
-- honest state of the system rather than a simulated conversation.
--
-- `chat_sessions`/`chat_messages` are deliberately NOT reused: those are the
-- AI assistant's transcript (role/content/token_count), a different concern.

/* ------------------------------------------------------------------ *
 *  conversations
 * ------------------------------------------------------------------ */

create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid references public.bookings(id) on delete set null,
  property_id      uuid references public.properties(id) on delete set null,
  guest_id         uuid not null references auth.users(id) on delete cascade,
  host_profile_id  uuid references public.hosts(id) on delete set null,
  host_user_id     uuid references auth.users(id) on delete set null,
  last_message     text,
  last_message_at  timestamptz,
  -- Denormalised unread counts. Kept by trigger so the conversation list does
  -- not need a correlated count per row.
  guest_unread     integer not null default 0,
  host_unread      integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One thread per guest per booking; inquiries (no booking) get one per
-- guest+property. Two partial indexes because NULLs are distinct in a unique
-- index, so a single index would let duplicate inquiry threads through.
create unique index if not exists uq_conversations_booking
  on public.conversations (guest_id, booking_id)
  where booking_id is not null;

create unique index if not exists uq_conversations_inquiry
  on public.conversations (guest_id, property_id)
  where booking_id is null;

create index if not exists idx_conversations_guest
  on public.conversations (guest_id, last_message_at desc nulls last);
create index if not exists idx_conversations_host_user
  on public.conversations (host_user_id, last_message_at desc nulls last)
  where host_user_id is not null;

/* ------------------------------------------------------------------ *
 *  messages
 * ------------------------------------------------------------------ */

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  -- Null while the host side has no account: there is a real recipient
  -- conceptually, but no user row to point at yet.
  receiver_id     uuid references auth.users(id) on delete set null,
  body            text not null check (length(btrim(body)) > 0),
  attachment_url  text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Paginating a thread reads newest-first within one conversation.
create index if not exists idx_messages_conversation
  on public.messages (conversation_id, created_at desc);
create index if not exists idx_messages_unread
  on public.messages (conversation_id, is_read)
  where is_read = false;

/* ------------------------------------------------------------------ *
 *  notifications
 * ------------------------------------------------------------------ */

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  description text,
  link        text,
  -- Free-form payload (booking ref, property id, amounts…). Deliberately
  -- schemaless so new notification kinds — including AI-generated summaries —
  -- need no migration.
  metadata    jsonb not null default '{}'::jsonb,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread
  on public.notifications (user_id)
  where is_read = false;

comment on column public.notifications.type is
  'booking.confirmed, payment.succeeded, message.received, account.welcome, review.reminder, …';

/* ------------------------------------------------------------------ *
 *  Row Level Security — a user sees only their own rows
 * ------------------------------------------------------------------ */

alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.notifications enable row level security;

-- conversations: either side may read; only the guest may open one.
drop policy if exists "conversations: participant reads" on public.conversations;
create policy "conversations: participant reads"
  on public.conversations for select
  using (guest_id = (select auth.uid()) or host_user_id = (select auth.uid()));

drop policy if exists "conversations: guest creates own" on public.conversations;
create policy "conversations: guest creates own"
  on public.conversations for insert
  with check (guest_id = (select auth.uid()));

drop policy if exists "conversations: participant updates" on public.conversations;
create policy "conversations: participant updates"
  on public.conversations for update
  using (guest_id = (select auth.uid()) or host_user_id = (select auth.uid()));

-- messages: readable only inside a conversation you belong to.
drop policy if exists "messages: participant reads" on public.messages;
create policy "messages: participant reads"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.guest_id = (select auth.uid()) or c.host_user_id = (select auth.uid()))
    )
  );

-- Sending requires BOTH that you are the sender and that you belong to the
-- thread — either check alone would let someone post into a stranger's thread
-- or forge another person's name.
drop policy if exists "messages: participant sends" on public.messages;
create policy "messages: participant sends"
  on public.messages for insert
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.guest_id = (select auth.uid()) or c.host_user_id = (select auth.uid()))
    )
  );

drop policy if exists "messages: participant marks read" on public.messages;
create policy "messages: participant marks read"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.guest_id = (select auth.uid()) or c.host_user_id = (select auth.uid()))
    )
  );

-- notifications: strictly your own.
drop policy if exists "notifications: own read" on public.notifications;
create policy "notifications: own read"
  on public.notifications for select
  using (user_id = (select auth.uid()));

drop policy if exists "notifications: own update" on public.notifications;
create policy "notifications: own update"
  on public.notifications for update
  using (user_id = (select auth.uid()));

drop policy if exists "notifications: own delete" on public.notifications;
create policy "notifications: own delete"
  on public.notifications for delete
  using (user_id = (select auth.uid()));

-- No INSERT policy on notifications on purpose: they are raised by the system
-- (triggers and the service role), never posted by a browser. A user who could
-- write their own notifications could forge "Payment successful".

/* ------------------------------------------------------------------ *
 *  Triggers
 * ------------------------------------------------------------------ */

-- Keep the conversation summary and unread counters in step with messages, so
-- the list view is a single cheap read.
create or replace function public.bump_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest uuid;
begin
  select guest_id into v_guest from public.conversations where id = new.conversation_id;

  update public.conversations
     set last_message    = left(new.body, 200),
         last_message_at = new.created_at,
         updated_at      = now(),
         -- The unread count belongs to whoever did NOT send it.
         guest_unread = guest_unread + case when new.sender_id = v_guest then 0 else 1 end,
         host_unread  = host_unread  + case when new.sender_id = v_guest then 1 else 0 end
   where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_messages_bump_conversation on public.messages;
create trigger trg_messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation_on_message();

-- Welcome notification, raised where the account is actually created rather
-- than from application code that a second signup path could bypass.
create or replace function public.notify_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, description, link)
  values (
    new.id,
    'account.welcome',
    'Welcome to StayLens',
    'Find a place you love, then book it in a couple of taps.',
    '/search'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_welcome on auth.users;
create trigger on_auth_user_welcome
  after insert on auth.users
  for each row execute function public.notify_new_user();

create or replace function public.touch_conversation_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_conversations_updated on public.conversations;
create trigger trg_conversations_updated
  before update on public.conversations
  for each row execute function public.touch_conversation_updated_at();
