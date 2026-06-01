-- Run this in Supabase SQL Editor.
-- Adds follow-up, notes, tags, and star fields to properties.

alter table public.properties
  add column if not exists is_starred boolean not null default false,
  add column if not exists follow_up_status text not null default 'new',
  add column if not exists follow_up_at timestamptz null,
  add column if not exists follow_up_tags text[] not null default '{}',
  add column if not exists follow_up_notes text null;

-- Keep follow-up status values controlled.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'properties_follow_up_status_check'
  ) then
    alter table public.properties
      add constraint properties_follow_up_status_check
      check (follow_up_status in ('new', 'in_progress', 'waiting_client', 'follow_up', 'closed', 'lost'));
  end if;
end
$$;

create index if not exists idx_properties_is_starred on public.properties (is_starred);
create index if not exists idx_properties_follow_up_at on public.properties (follow_up_at);
create index if not exists idx_properties_follow_up_status on public.properties (follow_up_status);

-- Optional: make existing null/empty statuses consistent.
update public.properties
set follow_up_status = 'new'
where follow_up_status is null or trim(follow_up_status) = '';
