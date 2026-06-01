-- Performance indexes for the Rowad app.
-- Run this script once in the Supabase SQL Editor.

-- ─────────────────────────────────────────────
-- properties table
-- ─────────────────────────────────────────────

-- Speeds up the default "order by id desc" full-table fetch used on both the
-- Properties page and the Dashboard.  The primary-key index already covers this,
-- so no extra index is needed here – it is listed only for documentation.
-- (PK index on properties.id is created automatically)

-- Date-based filtering: dashboard "Messages Today" and "Last 7 Days" widgets
-- look up rows by message_date.
create index if not exists idx_properties_message_date
  on public.properties (message_date);

-- Sender-mobile lookup: unique-sender counting and mobile search.
create index if not exists idx_properties_sender_mobile
  on public.properties (sender_mobile);

-- Sender-name lookup: name search.
create index if not exists idx_properties_sender_name
  on public.properties (sender_name);

-- Composite index for the follow-up dashboard panel that filters by both
-- status and date at the same time (overdue / due-today counts).
create index if not exists idx_properties_follow_up_status_at
  on public.properties (follow_up_status, follow_up_at);

-- Full-text search index on raw_message so that future server-side search
-- (ilike / to_tsvector queries) runs fast.
create index if not exists idx_properties_raw_message_fts
  on public.properties
  using gin (to_tsvector('simple', coalesce(raw_message, '')));

-- source_file is used in client-side filtering; index helps if a server-side
-- filter is ever added.
create index if not exists idx_properties_source_file
  on public.properties (source_file);

-- ─────────────────────────────────────────────
-- user_profiles table
-- ─────────────────────────────────────────────

-- user_id already has a UNIQUE constraint which creates an implicit B-tree
-- index – no extra index needed.

-- Administration page: .eq('subscription_approved', true)
--                       .order('subscription_end_date', { ascending: true })
-- A composite index lets Postgres satisfy both the filter and the sort in a
-- single index scan.
create index if not exists idx_user_profiles_approved_end_date
  on public.user_profiles (subscription_approved, subscription_end_date);

-- Subscription-expiry queries (e.g. finding soon-to-expire users).
create index if not exists idx_user_profiles_subscription_end_date
  on public.user_profiles (subscription_end_date);
