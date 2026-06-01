create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id bigserial primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  city text,
  subscription_start_date date not null default ((timezone('utc', now()))::date),
  subscription_end_date date not null default ((timezone('utc', now()) + interval '1 year')::date),
  subscription_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_user_profiles_updated_at();

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
on public.user_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Super admin can read all profiles" on public.user_profiles;
create policy "Super admin can read all profiles"
on public.user_profiles
for select
using ((auth.jwt() ->> 'email') = 'ahmedgfathy@gmail.com');

drop policy if exists "Super admin can update all profiles" on public.user_profiles;
create policy "Super admin can update all profiles"
on public.user_profiles
for update
using ((auth.jwt() ->> 'email') = 'ahmedgfathy@gmail.com')
with check ((auth.jwt() ->> 'email') = 'ahmedgfathy@gmail.com');
