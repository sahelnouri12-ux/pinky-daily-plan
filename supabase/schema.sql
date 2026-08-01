-- Pinky Daily Plan Vercel 1.4.0
-- Run this entire file in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  preferred_language text not null default 'fa' check (preferred_language in ('fa','en')),
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  schema_version integer not null default 15,
  revision bigint not null default 1,
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  subscription jsonb not null,
  language text not null default 'fa' check (language in ('fa','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, device_id)
);

create table if not exists public.push_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  task_id text not null,
  title text not null,
  reminder_at timestamptz not null,
  language text not null default 'fa' check (language in ('fa','en')),
  sent_at timestamptz,
  delivery_status text,
  processing_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, device_id, task_id)
);

alter table public.push_reminders add column if not exists processing_at timestamptz;
alter table public.push_reminders add column if not exists attempt_count integer not null default 0;
alter table public.push_reminders add column if not exists last_error text;

create index if not exists user_data_updated_at_idx on public.user_data(updated_at desc);
create index if not exists push_reminders_due_idx on public.push_reminders(reminder_at) where sent_at is null;
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.push_subscriptions;
create trigger subscriptions_set_updated_at before update on public.push_subscriptions for each row execute function public.set_updated_at();

drop trigger if exists reminders_set_updated_at on public.push_reminders;
create trigger reminders_set_updated_at before update on public.push_reminders for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, preferred_language)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'display_name',''),80),
    case when new.raw_user_meta_data->>'preferred_language' = 'en' then 'en' else 'fa' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Backfill profiles for users created before this migration.
insert into public.profiles (id, display_name)
select id, left(coalesce(raw_user_meta_data->>'display_name',''),80)
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.user_data enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_reminders enable row level security;

-- Profiles: users can read their row and update only non-privileged columns.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = id and role = 'user');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

revoke all on public.profiles from anon;
grant select, insert on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, preferred_language, updated_at) on public.profiles to authenticated;

-- Planner state: one private JSON document per user.
drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own" on public.user_data for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own" on public.user_data for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own" on public.user_data for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own" on public.user_data for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;

-- Atomic save with optimistic revision checking.
create or replace function public.save_pinky_state(
  p_data jsonb,
  p_schema_version integer,
  p_device_id text,
  p_expected_revision bigint default null
)
returns table(updated_at timestamptz, revision bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_updated_at timestamptz;
  v_revision bigint;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'invalid_state';
  end if;

  insert into public.user_data as existing (user_id, data, schema_version, revision, device_id, updated_at)
  values (v_uid, p_data, greatest(coalesce(p_schema_version,15),1), 1, left(p_device_id,180), now())
  on conflict (user_id) do update
    set data = excluded.data,
        schema_version = excluded.schema_version,
        revision = existing.revision + 1,
        device_id = excluded.device_id,
        updated_at = now()
    where p_expected_revision is null or existing.revision = p_expected_revision
  returning existing.updated_at, existing.revision into v_updated_at, v_revision;

  if not found then
    raise exception 'revision_conflict' using errcode = '40001';
  end if;

  return query select v_updated_at, v_revision;
end;
$$;

grant execute on function public.save_pinky_state(jsonb,integer,text,bigint) to authenticated;

-- Push tables are intentionally server-only. Vercel Functions use the server secret key.
revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.push_reminders from anon, authenticated;

-- Enable Realtime for cross-device update notices, if not already enabled.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_data'
  ) then
    alter publication supabase_realtime add table public.user_data;
  end if;
end $$;

-- To promote a user to admin after they register, run:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR_EMAIL');
